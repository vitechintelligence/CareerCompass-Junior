"""LangGraph orchestrates. Neon authorizes every tool and stores the record."""
from datetime import datetime, timezone
from typing import TypedDict, Literal
from uuid import uuid4
import os
from fastapi import HTTPException
from langgraph.graph import StateGraph, START, END
from langsmith import Client, tracing_context
from cc_lms.db import rows, one

class GraphState(TypedDict, total=False):
    workflow: str
    locale: str
    result: dict

ALLOWED = {
    "student_learning": {"student"},
    "teacher_support": {"teacher", "partner_admin"},
    "partner_operations": {"partner_admin"},
    "platform_support": {"platform_support", "partner_admin"},
    "book_content": {"content_editor"},
}

def student_learning(conn, actor, request):
    next_lessons = rows(conn, """
        SELECT e.id AS enrollment_id,l.id AS lesson_id,l.book_id,l.title,l.ordinal
        FROM public.book_enrollments e JOIN public.book_lessons l ON l.book_id=e.book_id
        WHERE e.active AND e.student_id=%s AND EXISTS(
          SELECT 1 FROM public.book_activities a WHERE a.lesson_id=l.id AND a.required AND NOT EXISTS(
            SELECT 1 FROM public.activity_attempts t WHERE t.activity_id=a.id AND t.enrollment_id=e.id
            AND t.status IN ('practised','submitted')))
        ORDER BY e.created_at,l.ordinal LIMIT 1
    """,(actor["id"],))
    return {"next_lessons":next_lessons,"message":{"vi-VN":"Bắt đầu bằng một từ. Thử nói, rồi tạo ý tưởng của em.","en-PH":"Start with one word. Try speaking, then make it your own."},
            "suggested_action":"open_lesson" if next_lessons else "ask_teacher"}

def teacher_support(conn, actor, request):
    queue = rows(conn,"SELECT class_id,count(*) AS count FROM public.learning_capsules WHERE review_status='unreviewed' GROUP BY class_id")
    return {"review_queue":queue,"lesson_minutes":[5,10,10,15,10,5,5],
            "message":{"vi-VN":"Xem sản phẩm trước khi nhận xét. Nêu hành động đã quan sát và một bước luyện tập tiếp theo.",
                       "en-PH":"Review the work before commenting. Name an observed action and one next practice step."},
            "suggested_action":"review_evidence"}

def partner_operations(conn, actor, request):
    unassigned=rows(conn,"SELECT c.id,c.name FROM public.classes c WHERE NOT EXISTS(SELECT 1 FROM public.teacher_assignments a WHERE a.class_id=c.id)")
    unenrolled=rows(conn,"SELECT u.id,u.display_name FROM public.users u WHERE u.role='student' AND NOT EXISTS(SELECT 1 FROM public.book_enrollments e WHERE e.student_id=u.id AND e.active)")
    return {"classes_without_teacher":unassigned,"students_without_book":unenrolled,
            "message":{"vi-VN":"Phân công giáo viên và ghi danh sách học cho từng học sinh.","en-PH":"Assign a teacher and enroll each student in a book."},
            "suggested_action":"complete_setup"}

def platform_support(conn, actor, request):
    # Support actors see tickets in their assigned organization only, never student evidence.
    tickets=rows(conn,"SELECT category,status,count(*) AS count FROM public.support_requests GROUP BY category,status")
    return {"tickets":tickets,"message":{"vi-VN":"Hỗ trợ trong phạm vi tổ chức được phân quyền.","en-PH":"Support is limited to the authorized organization."},"suggested_action":"review_support"}

def book_content(conn, actor, request):
    coverage=rows(conn,"SELECT b.slug,b.status,count(DISTINCT l.id) AS lessons,count(DISTINCT a.id) AS activities FROM public.book_catalog b LEFT JOIN public.book_lessons l ON l.book_id=b.id LEFT JOIN public.book_activities a ON a.book_id=b.id GROUP BY b.id")
    return {"coverage":coverage,"message":{"vi-VN":"Kiểm tra nguồn, bản dịch và hình minh họa trước khi phát hành.","en-PH":"Review sources, translations and illustrations before publishing."},"suggested_action":"editorial_review"}

TOOLS = {
    "student_learning":student_learning, "teacher_support":teacher_support,
    "partner_operations":partner_operations, "platform_support":platform_support, "book_content":book_content,
}

def safe_trace(workflow, locale, role_name, success):
    if os.getenv("LANGSMITH_ENABLED","false").lower()!="true" or not os.getenv("LANGSMITH_API_KEY"):
        return
    # Only allowlisted operational metadata leaves the application.
    # No IDs, credentials, IP addresses, prompts, responses, files, or learner profiles.
    try:
        now=datetime.now(timezone.utc)
        client=Client(api_key=os.environ["LANGSMITH_API_KEY"])
        client.create_run(id=uuid4(),name="career-compass.authorized-workflow",run_type="chain",
                          inputs={"workflow":workflow,"locale":locale,"role":role_name},
                          outputs={"success":success},start_time=now,end_time=now,
                          project_name=os.getenv("LANGSMITH_PROJECT","career-compass-lms"))
    except Exception:
        pass  # Observability failure never blocks a lesson.

def run_workflow(conn, actor, request):
    def authorize(state):
        trusted = one(conn,"SELECT cc_private.actor()::text AS id,cc_private.role() AS role")
        if trusted["id"]!=actor["id"] or trusted["role"] not in ALLOWED[request.workflow]:
            raise HTTPException(403,"not_allowed")
        return {}

    def execute(state):
        return {"result":TOOLS[request.workflow](conn,actor,request)}

    builder=StateGraph(GraphState)
    builder.add_node("authorize",authorize)
    builder.add_node("authorized_tool",execute)
    builder.add_edge(START,"authorize")
    builder.add_edge("authorize","authorized_tool")
    builder.add_edge("authorized_tool",END)
    graph=builder.compile()  # Request scoped, no cross-tenant checkpoint or shared memory.
    success=False
    try:
        with tracing_context(enabled=False):
            result=graph.invoke({"workflow":request.workflow,"locale":request.locale},{"recursion_limit":5})["result"]
        success=True
        return result
    finally:
        safe_trace(request.workflow,request.locale,actor["role"],success)
