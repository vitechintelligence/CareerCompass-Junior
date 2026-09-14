import os
import uuid
import json
import psycopg
import pytest
from cc_lms.schemas import WorkflowRequest
from cc_lms.workflows import safe_trace
from tests.conftest import browser_client,sign_in,provision

def attempt(j,answer="yes",key=None):
    return {"enrollment_id":j["enrollment"],"activity_id":j["activity"],"idempotency_key":key or str(uuid.uuid4()),"response":{"answer":answer}}

def test_complete_partner_student_book_teacher_analytics(journey):
    j=journey;s=j["student"];t=j["teacher"];p=j["partner"]
    assert not any("password" in k or "hash" in k for k in j["student_record"])
    book=s.get("/api/books/"+j["book"])
    assert book.status_code==200
    lesson=s.get("/api/lessons/"+j["lesson"]).json()
    assert "answer" not in lesson["activities"][0]
    wrong=s.post("/api/attempts",json=attempt(j,"no"))
    assert wrong.status_code==200 and wrong.json()["correct"] is False
    body=attempt(j)
    correct=s.post("/api/attempts",json=body)
    assert correct.status_code==200 and correct.json()["correct"] is True
    replay=s.post("/api/attempts",json=body)
    assert replay.json()["replayed"] is True
    seen=t.get("/api/dashboard").json()
    assert len(seen["capsules"])==2
    assert seen["progress"][0]["practiced_activities"]==1
    assert seen["progress"][0]["total_activities"]==1
    feedback=t.post("/api/feedback",json={"class_id":j["class_id"],"student_id":j["student_record"]["id"],"capsule_id":correct.json()["capsule_id"],"skill":"Communication","observed_action":"Used a greeting in the activity.","next_step":"Try a greeting with a partner.","locale":"en-PH"})
    assert feedback.status_code==200,feedback.text
    assert s.get("/api/dashboard").json()["feedback"][0]["observed_action"]=="Used a greeting in the activity."
    assert p.get("/api/analytics").json()["evidence"]["reviewed"]==1
    assert s.get("/api/evidence/export").status_code==200

def test_role_and_organization_boundaries(journey):
    j=journey
    other=browser_client();sign_in(other,j["orgs"][1])
    assert other.get("/api/dashboard").json()["classes"]==[]
    assert other.post("/api/enrollments",json={"class_id":j["class_id"],"student_id":j["student_record"]["id"],"book_id":j["book"]}).status_code in(403,422)
    assert j["student"].get("/api/analytics").status_code==403
    assert j["teacher"].get("/api/analytics").status_code==403
    assert j["student"].post("/api/classes",json={"name":"Illegal class","schedule":"","age_band":"7-12"}).status_code==403
    assert j["teacher"].post("/api/people",json={"display_name":"Not allowed","role":"student","class_id":j["class_id"]}).status_code==403
    for key in ["partner_operations","teacher_support","book_content","platform_support"]:
        assert j["student"].post("/api/workflows",json={"workflow":key,"locale":"vi-VN"}).status_code==403
    assert j["student"].post("/api/workflows",json={"workflow":"student_learning","locale":"vi-VN"}).status_code==200

def test_credentials_never_browser_readable(journey):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute("SET LOCAL ROLE cc_runtime")
        flags=conn.execute("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user").fetchone()
        assert flags==(False,False)
        assert not conn.execute("SELECT has_table_privilege(current_user,'cc_private.student_credentials','SELECT')").fetchone()[0]
        assert not conn.execute("SELECT has_table_privilege(current_user,'cc_private.staff_credentials','SELECT')").fetchone()[0]
        assert not conn.execute("SELECT has_table_privilege(current_user,'cc_private.activity_keys','SELECT')").fetchone()[0]
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("SELECT * FROM cc_private.student_credentials")
    raw=journey["student"].get("/api/dashboard").text
    assert "password_hash" not in raw and "activation_code" not in raw

def test_session_csrf_activation_replay_and_reset(journey):
    j=journey;s=j["student"];p=j["partner"];org=j["orgs"][0]
    assert "HttpOnly" in s.cookies.get("cc_session","") or s.cookies.get("cc_session")
    saved=s.headers.pop("X-CSRF-Token")
    assert s.post("/api/attempts",json=attempt(j)).status_code==403
    s.headers["X-CSRF-Token"]=saved
    foreign=s.post("/api/attempts",json=attempt(j),headers={"Origin":"https://other.example"})
    assert foreign.status_code==403
    record=j["student_record"]
    assert browser_client().post("/api/activate",json={"organization":org["slug"],"username":record["username"],"password":j["password"],"activation_code":record["activation_code"]}).status_code==400
    reset=p.post("/api/people/"+record["id"]+"/reset",json={})
    assert reset.status_code==200
    assert s.get("/api/me").status_code==401
    assert "password" not in reset.json()

def test_separate_class_cannot_read_evidence(journey):
    j=journey;p=j["partner"]
    other_class=p.post("/api/classes",json={"name":"Separate class","schedule":"","age_band":"7-12"}).json()["id"]
    _,outsider,_=provision(p,j["orgs"][0],"teacher",other_class,j["password"])
    result=j["student"].post("/api/attempts",json=attempt(j)).json()
    assert outsider.get("/api/attempts/"+result["attempt_id"]).status_code==404
    assert outsider.get("/api/books/"+j["book"]).status_code==403
    assert outsider.get("/api/dashboard").json()["capsules"]==[]

def test_assignment_submission_attendance_payment(journey):
    j=journey;p=j["partner"];t=j["teacher"];s=j["student"];sid=j["student_record"]["id"]
    a=t.post("/api/assignments",json={"class_id":j["class_id"],"title":"A small idea","instructions":"Describe one useful idea.","locale":"en-PH"}).json()
    r=s.post("/api/submissions",json={"assignment_id":a["id"],"body":"My learning idea.","attachment_name":"work.txt","attachment_base64":"dGVzdA=="})
    assert r.status_code==200,r.text
    assert t.get("/api/submissions/"+r.json()["id"]+"/attachment").content==b"test"
    at=t.post("/api/attendance",json={"class_id":j["class_id"],"student_id":sid,"session_date":"2026-09-14","status":"present"})
    assert at.status_code==200
    assert t.post("/api/attendance",json={"class_id":j["class_id"],"student_id":sid,"session_date":"2026-09-14","status":"late"}).status_code==200
    payment=p.post("/api/payments",json={"student_id":sid,"label":"Synthetic tuition","amount_vnd":500000})
    assert payment.status_code==200
    pid=payment.json()["id"]
    assert s.post("/api/payments/"+pid+"/confirm",json={"reference":"fake"}).status_code==403
    assert p.post("/api/payments/"+pid+"/confirm",json={"reference":"TEST-RECEIPT"}).status_code==200
    assert p.get("/api/analytics").json()["payments"][0]["amount_vnd"]==500000

def test_idempotency_conflict_is_not_second_evidence(journey):
    j=journey;key=str(uuid.uuid4())
    assert j["student"].post("/api/attempts",json=attempt(j,"yes",key)).status_code==200
    assert j["student"].post("/api/attempts",json=attempt(j,"no",key)).status_code==409
    assert len(j["teacher"].get("/api/dashboard").json()["capsules"])==1

def test_login_rate_limit_and_generic_error(world):
    c=browser_client();org=world["orgs"][0]
    for _ in range(11):
        r=c.post("/api/login",json={"organization":org["slug"],"username":"admin","password":"Wrong-synthetic-password"})
        assert r.status_code==401
        assert r.json()=={"detail":"sign_in_failed"}
    assert c.post("/api/login",json={"organization":org["slug"],"username":"admin","password":org["password"]}).status_code==401

def test_trace_allowlist(monkeypatch):
    events=[]
    class TraceClient:
        def __init__(self,**kwargs):pass
        def create_run(self,**kwargs):events.append(kwargs)
    monkeypatch.setenv("LANGSMITH_ENABLED","true")
    monkeypatch.setenv("LANGSMITH_API_KEY","synthetic")
    monkeypatch.setattr("cc_lms.workflows.Client",TraceClient)
    safe_trace("student_learning","vi-VN","student",True)
    assert events[0]["inputs"]=={"workflow":"student_learning","locale":"vi-VN","role":"student"}
    assert events[0]["outputs"]=={"success":True}
    assert set(events[0]["inputs"])=={"workflow","locale","role"}
