import os
os.environ["APP_ENV"]="development"
os.environ["APP_ORIGIN"]="http://127.0.0.1:8000"
os.environ["RATE_LIMIT_SECRET"]="synthetic-test-rate-key-32-characters-minimum"
os.environ["LANGSMITH_ENABLED"]="false"
import hashlib
from pathlib import Path
import secrets
import uuid
import psycopg
from psycopg.types.json import Jsonb
import pytest
from fastapi.testclient import TestClient
from app import app

@pytest.fixture(scope="session",autouse=True)
def schema():
    url=os.getenv("DATABASE_URL")
    if not url:
        pytest.fail("DATABASE_URL must point to a disposable test PostgreSQL database.")
    with psycopg.connect(url) as conn:
        for path in sorted((Path(__file__).parents[1]/"migrations").glob("*.sql")):
            conn.execute(path.read_text(),prepare=False)

@pytest.fixture
def world(schema):
    suffix=uuid.uuid4().hex[:10]
    password="Synthetic-test-password-12!"
    organizations=[]
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        for index in range(2):
            oid=uuid.uuid4();uid=uuid.uuid4();slug=f"test-{suffix}-{index}"
            conn.execute("INSERT INTO public.organizations(id,name,slug,kind) VALUES(%s,%s,%s,'school')",(oid,"Synthetic School "+str(index),slug))
            conn.execute("INSERT INTO cc_private.identities(id,organization_id,semantic_id,username,role) VALUES(%s,%s,%s,'admin','partner_admin')",(uid,oid,"vn-test-"+uid.hex))
            conn.execute("INSERT INTO public.users(id,organization_id,semantic_id,username,role,display_name) VALUES(%s,%s,%s,'admin','partner_admin','Synthetic administrator')",(uid,oid,"vn-test-"+uid.hex))
            conn.execute("INSERT INTO cc_private.staff_credentials(user_id,password_hash,activated) VALUES(%s,crypt(%s,gen_salt('bf',12)),true)",(uid,password))
            organizations.append({"id":str(oid),"slug":slug,"user_id":str(uid),"password":password})
        bid=uuid.uuid4();unit=uuid.uuid4();lesson=uuid.uuid4();activity=uuid.uuid4()
        bilingual={"vi-VN":"Bài học thử nghiệm","en-PH":"Synthetic learning fixture"}
        bundle={"version":1,"book":{"id":str(bid),"slug":"test-"+suffix,"title":bilingual,"subtitle":bilingual,"age_band":"7-12","level":"A0–A1","expected_lessons":1,"cycle_weeks":1,"source_manifest":{"synthetic":True}},"units":[{"id":str(unit),"ordinal":1,"title":bilingual}],"lessons":[{"id":str(lesson),"unit_id":str(unit),"ordinal":1,"title":bilingual,"content":{"vocabulary":[{"en":"hello","vi":"xin chào","picture":"👋"}],"models":[{"en":"Hello, team!","vi":"Xin chào cả nhóm!"}]},"source_pages":[1]}],"pages":[{"page_number":1,"source_text":"Synthetic test page."}],"activities":[{"id":str(activity),"lesson_id":str(lesson),"ordinal":1,"kind":"choice","prompt":bilingual,"payload":{"options":[{"id":"yes","label":{"vi-VN":"xin chào","en-PH":"hello"}},{"id":"no","label":{"vi-VN":"tạm biệt","en-PH":"goodbye"}}]},"answer":"yes"}]}
        conn.execute("SELECT cc_private.import_book_bundle(%s)",(Jsonb(bundle),))
    return {"orgs":organizations,"book":str(bid),"lesson":str(lesson),"activity":str(activity),"password":password}

def browser_client():
    return TestClient(app,base_url="http://127.0.0.1:8000",headers={"Origin":"http://127.0.0.1:8000"})

def sign_in(client,org,username="admin",password=None):
    result=client.post("/api/login",json={"organization":org["slug"],"username":username,"password":password or org["password"]})
    assert result.status_code==200
    me=client.get("/api/me").json()["user"]
    client.headers["X-CSRF-Token"]=me["csrf"]
    return me

def provision(client,org,kind,class_id,password):
    r=client.post("/api/people",json={"display_name":"Synthetic "+kind,"role":kind,"class_id":class_id})
    assert r.status_code==200,r.text
    data=r.json()
    activation=browser_client()
    assert activation.post("/api/activate",json={"organization":org["slug"],"username":data["username"],"password":password,"activation_code":data["activation_code"]}).status_code==200
    actor=sign_in(activation,org,data["username"],password)
    return data,activation,actor

@pytest.fixture
def journey(world):
    org=world["orgs"][0]
    partner=browser_client();sign_in(partner,org)
    class_result=partner.post("/api/classes",json={"name":"Discovery Class","schedule":"Tuesday / Thursday","age_band":"7-12"})
    assert class_result.status_code==200
    cid=class_result.json()["id"]
    student,sclient,sactor=provision(partner,org,"student",cid,world["password"])
    teacher,tclient,tactor=provision(partner,org,"teacher",cid,world["password"])
    enrollment=partner.post("/api/enrollments",json={"class_id":cid,"student_id":student["id"],"book_id":world["book"]})
    assert enrollment.status_code==200,enrollment.text
    return {**world,"partner":partner,"student":sclient,"teacher":tclient,"student_record":student,"student_actor":sactor,"teacher_actor":tactor,"class_id":cid,"enrollment":enrollment.json()["id"]}
