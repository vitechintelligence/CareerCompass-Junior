import base64
import binascii
import hashlib
import hmac
import os
from pathlib import Path
from urllib.parse import urlparse
from uuid import UUID

import psycopg
from psycopg.types.json import Jsonb
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from cc_lms.db import database, digest, rows, one, role
from cc_lms.schemas import *

ROOT = Path(__file__).parent
app = FastAPI(title="Career Compass LMS", docs_url=None, redoc_url=None, openapi_url=None)
COOKIE = "cc_session"
PRODUCTION = os.getenv("APP_ENV", "production") == "production"
ORIGIN = os.getenv("APP_ORIGIN", "").rstrip("/")
CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'"

def token(request):
    return request.cookies.get(COOKIE)

def csrf(request, actor):
    supplied = request.headers.get("X-CSRF-Token", "")
    if not hmac.compare_digest(supplied, actor["csrf"]):
        raise HTTPException(403, "refresh_and_retry")

def ip_tag(request):
    secret = os.getenv("RATE_LIMIT_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(503, "setup_required")
    # Vercel controls this header. Ignore arbitrary forwarded headers locally.
    address = request.headers.get("x-vercel-forwarded-for", "") if os.getenv("VERCEL") else ""
    address = address or (request.client.host if request.client else "unknown")
    return hmac.new(secret.encode(), address.encode(), hashlib.sha256).hexdigest()

@app.middleware("http")
async def boundary(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if not ORIGIN or request.headers.get("origin") != ORIGIN:
            return JSONResponse({"detail": "origin_not_allowed"}, 403)
        if request.headers.get("content-type", "").split(";")[0] != "application/json":
            return JSONResponse({"detail": "json_required"}, 415)
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 1500000:
                return JSONResponse({"detail": "file_too_large"}, 413)
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = CSP
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    if PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Pydantic's default error includes submitted values, including passwords.
    return JSONResponse({"detail": "invalid_input"}, 422)

@app.exception_handler(psycopg.Error)
async def database_error(request, exc):
    code = exc.sqlstate or ""
    status = 403 if code == "42501" else 409 if code == "23505" else 422 if code.startswith("23") or code == "P0001" else 503
    return JSONResponse({"detail": {403:"not_allowed",409:"already_exists",422:"invalid_input",503:"service_unavailable"}[status]}, status)

@app.get("/api/health")
def health():
    return {"service": "career-compass-lms", "status": "ok", "database_configured": bool(os.getenv("DATABASE_URL"))}

@app.post("/api/login")
def login(data: Login, request: Request):
    with database(authenticated=False) as (conn, _):
        result = one(conn, "SELECT cc_private.login(%s,%s,%s,%s) AS result",
                     (data.organization,data.username,data.password,ip_tag(request)))["result"]
    if not result.get("ok"):
        raise HTTPException(401, "sign_in_failed")
    response = JSONResponse({"ok": True})
    response.set_cookie(COOKIE, result["token"], httponly=True, secure=PRODUCTION, samesite="strict", max_age=28800, path="/")
    return response

@app.post("/api/activate")
def activate(data: Activation, request: Request):
    with database(authenticated=False) as (conn,_):
        ok = one(conn,"SELECT cc_private.activate(%s,%s,%s,%s,%s) AS ok",
                 (data.organization,data.username,data.activation_code,data.password,ip_tag(request)))["ok"]
    if not ok:
        raise HTTPException(400,"activation_failed")
    return {"ok":True}

@app.post("/api/register-partner")
def register(data: Registration, request: Request):
    with database(authenticated=False) as (conn,_):
        ok = one(conn,"SELECT cc_private.register_partner(%s,%s,%s,%s,%s,%s,%s) AS ok",
                 (data.invitation,data.organization_name,data.organization,data.kind,data.username,data.password,ip_tag(request)))["ok"]
    if not ok:
        raise HTTPException(400,"invitation_failed")
    return {"ok":True}

@app.post("/api/logout")
def logout(request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor)
        conn.execute("SELECT cc_private.logout(%s)",(digest(token(request)),))
    response = JSONResponse({"ok": True})
    response.delete_cookie(COOKIE,path="/",secure=PRODUCTION,httponly=True,samesite="strict")
    return response

@app.get("/api/me")
def me(request: Request):
    with database(token(request)) as (conn,actor):
        return {"user":actor,"organization":one(conn,"SELECT * FROM public.organizations WHERE id=%s",(actor["organization_id"],))}

@app.get("/api/catalog")
def catalog():
    with database(authenticated=False) as (conn,_):
        return rows(conn,"SELECT id,slug,title,subtitle,age_band,level,cycle_weeks,expected_lessons,cover_url FROM public.book_catalog ORDER BY age_band,slug")

@app.get("/api/dashboard")
def dashboard(request: Request):
    with database(token(request)) as (conn,actor):
        result = {}
        # Fixed query allowlist; tenant and class boundaries are enforced by RLS.
        queries = {
            "users":"SELECT * FROM public.users ORDER BY created_at DESC LIMIT 500",
            "classes":"SELECT * FROM public.classes ORDER BY created_at DESC LIMIT 100",
            "memberships":"SELECT * FROM public.class_memberships LIMIT 1000",
            "teacher_assignments":"SELECT * FROM public.teacher_assignments LIMIT 500",
            "enrollments":"SELECT * FROM public.book_enrollments WHERE active ORDER BY created_at DESC LIMIT 500",
            "progress":"SELECT * FROM public.book_progress LIMIT 500",
            "capsules":"SELECT * FROM public.learning_capsules ORDER BY created_at DESC LIMIT 100",
            "attendance":"SELECT * FROM public.attendance ORDER BY session_date DESC LIMIT 1000",
            "assignments":"SELECT * FROM public.assignments ORDER BY created_at DESC LIMIT 100",
            "submissions":"SELECT id,organization_id,class_id,assignment_id,student_id,body,attachment_name,created_at FROM public.submissions ORDER BY created_at DESC LIMIT 100",
            "feedback":"SELECT * FROM public.teacher_feedback ORDER BY created_at DESC LIMIT 200",
            "announcements":"SELECT * FROM public.announcements ORDER BY created_at DESC LIMIT 100",
            "resources":"SELECT * FROM public.resources ORDER BY created_at DESC LIMIT 100",
            "notes":"SELECT * FROM public.student_notes ORDER BY created_at DESC LIMIT 100",
        }
        for key,query in queries.items():
            result[key] = rows(conn,query)
        if actor["role"] == "partner_admin":
            result["payments"] = rows(conn,"SELECT * FROM public.payments ORDER BY created_at DESC LIMIT 500")
            result["analytics"] = organization_analytics(conn)
        return result

def organization_analytics(conn):
    return {
        "people":rows(conn,"SELECT role,count(*) AS count FROM public.users GROUP BY role"),
        "attendance":rows(conn,"SELECT status,count(*) AS count FROM public.attendance GROUP BY status"),
        "evidence":one(conn,"SELECT count(*) AS attempts,count(*) FILTER(WHERE review_status='reviewed') AS reviewed FROM public.learning_capsules"),
        "payments":rows(conn,"SELECT status,count(*) AS count,coalesce(sum(amount_vnd),0) AS amount_vnd FROM public.payments GROUP BY status"),
        "classes":rows(conn,"SELECT c.id,c.name,count(DISTINCT m.student_id) AS students,count(DISTINCT p.enrollment_id) AS active_books FROM public.classes c LEFT JOIN public.class_memberships m ON m.class_id=c.id LEFT JOIN public.book_progress p ON p.class_id=c.id GROUP BY c.id,c.name ORDER BY c.name"),
    }

@app.get("/api/analytics")
def analytics(request: Request):
    with database(token(request)) as (conn,actor):
        role(actor,"partner_admin")
        return organization_analytics(conn)

@app.get("/api/books/{book_id}")
def book(book_id: UUID, request: Request):
    with database(token(request)) as (conn,actor):
        if not one(conn,"SELECT cc_private.book_access(%s) AS ok",(book_id,))["ok"]:
            raise HTTPException(403,"not_enrolled")
        return {"book":one(conn,"SELECT * FROM public.book_catalog WHERE id=%s",(book_id,)),
                "units":rows(conn,"SELECT * FROM public.book_units WHERE book_id=%s ORDER BY ordinal",(book_id,)),
                "lessons":rows(conn,"SELECT id,unit_id,ordinal,title,source_pages,adaptation_status FROM public.book_lessons WHERE book_id=%s ORDER BY ordinal",(book_id,))}

@app.get("/api/lessons/{lesson_id}")
def lesson(lesson_id: UUID, request: Request):
    with database(token(request)) as (conn,actor):
        item = one(conn,"SELECT * FROM public.book_lessons WHERE id=%s",(lesson_id,))
        return {"lesson":item,"activities":rows(conn,"SELECT * FROM public.book_activities WHERE lesson_id=%s ORDER BY ordinal",(lesson_id,)),
                "attempts":rows(conn,"SELECT at.id,at.activity_id,at.status,at.correct,at.created_at FROM public.activity_attempts at JOIN public.book_activities a ON a.id=at.activity_id WHERE a.lesson_id=%s AND at.student_id=%s ORDER BY at.created_at",(lesson_id,actor["id"]))}

@app.get("/api/books/{book_id}/pages/{page}")
def source_page(book_id: UUID,page: int,request: Request):
    with database(token(request)) as (conn,_):
        return one(conn,"SELECT * FROM public.book_pages WHERE book_id=%s AND page_number=%s",(book_id,page))

@app.post("/api/attempts")
def attempt(data: Attempt,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor); role(actor,"student")
        return one(conn,"SELECT public.submit_book_activity(%s,%s,%s,%s) AS result",
                   (data.enrollment_id,data.activity_id,Jsonb(data.response.model_dump(exclude_none=True)),data.idempotency_key))["result"]

@app.get("/api/attempts/{attempt_id}")
def evidence_detail(attempt_id: UUID,request: Request):
    with database(token(request)) as (conn,_):
        return one(conn,"SELECT * FROM public.activity_attempts WHERE id=%s",(attempt_id,))

@app.get("/api/evidence/export")
def export_evidence(request: Request):
    with database(token(request)) as (conn,actor):
        role(actor,"student")
        return {"version":1,"semantic_id":actor["semantic_id"],
                "capsules":rows(conn,"SELECT * FROM public.learning_capsules WHERE student_id=%s ORDER BY created_at",(actor["id"],)),
                "feedback":rows(conn,"SELECT * FROM public.teacher_feedback WHERE student_id=%s ORDER BY created_at",(actor["id"],))}

@app.post("/api/classes")
def create_class(data: ClassCreate,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        return one(conn,"INSERT INTO public.classes(organization_id,name,schedule,age_band) VALUES(%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.name,data.schedule,data.age_band))

@app.post("/api/people")
def create_person(data: PersonCreate,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        if data.role == "student":
            return one(conn,"SELECT public.provision_k12_student(%s,%s) AS result",(data.display_name,data.class_id))["result"]
        return one(conn,"SELECT cc_private.provision_person(%s,'teacher',%s) AS result",(data.display_name,data.class_id))["result"]

@app.post("/api/people/{person_id}/reset")
def reset_person(person_id: UUID,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        return one(conn,"SELECT cc_private.reset_access(%s) AS result",(person_id,))["result"]

@app.post("/api/memberships")
def membership(data: Membership,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        if data.kind=="student":
            conn.execute("INSERT INTO public.class_memberships(organization_id,class_id,student_id) VALUES(%s,%s,%s)",(actor["organization_id"],data.class_id,data.user_id))
        else:
            conn.execute("INSERT INTO public.teacher_assignments(organization_id,class_id,teacher_id) VALUES(%s,%s,%s)",(actor["organization_id"],data.class_id,data.user_id))
        return {"ok":True}

@app.post("/api/enrollments")
def enroll(data: Enroll,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        return one(conn,"INSERT INTO public.book_enrollments(organization_id,class_id,student_id,book_id) VALUES(%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.class_id,data.student_id,data.book_id))

@app.post("/api/attendance")
def attendance(data: Attendance,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"teacher","partner_admin")
        return one(conn,"INSERT INTO public.attendance(organization_id,class_id,student_id,session_date,status,marked_by) VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT(class_id,student_id,session_date) DO UPDATE SET status=excluded.status,marked_by=excluded.marked_by RETURNING *",
                   (actor["organization_id"],data.class_id,data.student_id,data.session_date,data.status,actor["id"]))

@app.post("/api/assignments")
def assignment(data: Assignment,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"teacher","partner_admin")
        return one(conn,"INSERT INTO public.assignments(organization_id,class_id,created_by,title,instructions,due_at) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.class_id,actor["id"],data.title,Jsonb({data.locale:data.instructions}),data.due_at))

@app.post("/api/submissions")
def submit(data: Submission,request: Request):
    blob = None
    if data.attachment_base64:
        try:
            blob = base64.b64decode(data.attachment_base64,validate=True)
        except (binascii.Error,ValueError):
            raise HTTPException(422,"invalid_file")
        if len(blob)>1048576:
            raise HTTPException(413,"file_too_large")
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"student")
        target=one(conn,"SELECT * FROM public.assignments WHERE id=%s",(data.assignment_id,))
        return one(conn,"INSERT INTO public.submissions(organization_id,class_id,assignment_id,student_id,body,attachment_name,attachment_mime,attachment_bytes) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(assignment_id,student_id) DO UPDATE SET body=excluded.body,attachment_name=excluded.attachment_name,attachment_mime=excluded.attachment_mime,attachment_bytes=excluded.attachment_bytes,created_at=now() RETURNING id",
                   (actor["organization_id"],target["class_id"],data.assignment_id,actor["id"],data.body,data.attachment_name,"application/octet-stream" if blob else None,blob))

@app.get("/api/submissions/{submission_id}/attachment")
def download_attachment(submission_id: UUID,request: Request):
    with database(token(request)) as (conn,_):
        item=one(conn,"SELECT attachment_bytes FROM public.submissions WHERE id=%s",(submission_id,))
        if item["attachment_bytes"] is None:
            raise HTTPException(404,"not_found")
        return Response(bytes(item["attachment_bytes"]),media_type="application/octet-stream",headers={"Content-Disposition":'attachment; filename="student-work.bin"',"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"})

@app.post("/api/feedback")
def feedback(data: Feedback,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"teacher","partner_admin")
        return one(conn,"INSERT INTO public.teacher_feedback(organization_id,class_id,student_id,teacher_id,capsule_id,observed_action,next_step,skill,locale) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.class_id,data.student_id,actor["id"],data.capsule_id,data.observed_action,data.next_step,data.skill,data.locale))

@app.post("/api/announcements")
def announcement(data: Communication,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"teacher","partner_admin")
        return one(conn,"INSERT INTO public.announcements(organization_id,class_id,created_by,title,body) VALUES(%s,%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.class_id,actor["id"],data.title,data.body))

@app.post("/api/resources")
def resource(data: Resource,request: Request):
    parsed=urlparse(data.url)
    if not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(422,"invalid_url")
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"teacher","partner_admin")
        return one(conn,"INSERT INTO public.resources(organization_id,class_id,created_by,title,url,kind) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.class_id,actor["id"],data.title,data.url,data.kind))

@app.post("/api/payments")
def payment(data: Payment,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        return one(conn,"INSERT INTO public.payments(organization_id,student_id,label,amount_vnd,created_by) VALUES(%s,%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],data.student_id,data.label,data.amount_vnd,actor["id"]))

@app.post("/api/payments/{payment_id}/confirm")
def confirm(payment_id: UUID,data: Receipt,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"partner_admin")
        ok=one(conn,"SELECT cc_private.confirm_payment(%s,%s) AS ok",(payment_id,data.reference))["ok"]
        if not ok: raise HTTPException(409,"payment_not_pending")
        return {"ok":True}

@app.post("/api/notes")
def note(data: Note,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor);role(actor,"student")
        return one(conn,"INSERT INTO public.student_notes(organization_id,student_id,title,body) VALUES(%s,%s,%s,%s) RETURNING *",
                   (actor["organization_id"],actor["id"],data.title,data.body))

@app.post("/api/support")
def support(data: Support,request: Request):
    with database(token(request)) as (conn,actor):
        csrf(request,actor)
        return one(conn,"INSERT INTO public.support_requests(organization_id,user_id,category,message) VALUES(%s,%s,%s,%s) RETURNING id",
                   (actor["organization_id"],actor["id"],data.category,data.message))

@app.post("/api/workflows")
def workflows(data: WorkflowRequest,request: Request):
    from cc_lms.workflows import run_workflow
    with database(token(request)) as (conn,actor):
        csrf(request,actor)
        return run_workflow(conn,actor,data)

@app.get("/")
def index():
    return FileResponse(ROOT/"public"/"index.html",headers={"Cache-Control":"no-cache"})

# Explicit local routes also work when public assets are served by Vercel's CDN.
@app.get("/app.js")
def javascript():
    return FileResponse(ROOT/"public"/"app.js",media_type="text/javascript")

@app.get("/styles.css")
def stylesheet():
    return FileResponse(ROOT/"public"/"styles.css",media_type="text/css")

@app.get("/illustrations.svg")
def illustrations():
    return FileResponse(ROOT/"public"/"illustrations.svg",media_type="image/svg+xml")
