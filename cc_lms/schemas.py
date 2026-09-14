from typing import Any, Literal
from uuid import UUID
from datetime import date, datetime
import math
from pydantic import BaseModel, ConfigDict, Field, field_validator

Locale = Literal["vi-VN", "en-PH"]

class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")

class Login(Model):
    organization: str = Field(min_length=3, max_length=48, pattern=r"^[a-z0-9-]+$")
    username: str = Field(min_length=3, max_length=48, pattern=r"^[a-z0-9._-]+$")
    password: str = Field(min_length=8, max_length=72)

class Activation(Login):
    activation_code: str = Field(min_length=24, max_length=96, pattern=r"^[a-f0-9]+$")

class Registration(Login):
    invitation: str = Field(min_length=24, max_length=96, pattern=r"^[a-f0-9]+$")
    organization_name: str = Field(min_length=2, max_length=160)
    kind: Literal["school", "center", "organization"]

class ClassCreate(Model):
    name: str = Field(min_length=2, max_length=120)
    schedule: str = Field(default="", max_length=500)
    age_band: Literal["4-6", "7-12", "13-18"]

class PersonCreate(Model):
    display_name: str = Field(min_length=1, max_length=80)
    role: Literal["student", "teacher"]
    class_id: UUID | None = None

class Membership(Model):
    class_id: UUID
    user_id: UUID
    kind: Literal["student", "teacher"]

class Enroll(Model):
    class_id: UUID
    student_id: UUID
    book_id: UUID

class ActivityResponse(Model):
    answer: str | list[Any] | dict[str, Any] | None = None
    text: str | None = Field(default=None, max_length=5000)
    practised: bool | None = None
    strokes: list[list[tuple[float, float]]] | None = None

    @field_validator("strokes")
    @classmethod
    def limited_drawing(cls, value):
        if value is not None:
            if len(value) > 100 or sum(map(len, value)) > 2000:
                raise ValueError("drawing_too_large")
            if any(not math.isfinite(v) or v < 0 or v > 1200 for stroke in value for point in stroke for v in point):
                raise ValueError("invalid_point")
        return value

class Attempt(Model):
    enrollment_id: UUID
    activity_id: UUID
    idempotency_key: UUID
    response: ActivityResponse

class Attendance(Model):
    class_id: UUID
    student_id: UUID
    session_date: date
    status: Literal["present", "absent", "late", "excused"]

class Assignment(Model):
    class_id: UUID
    title: str = Field(min_length=2, max_length=200)
    instructions: str = Field(min_length=2, max_length=5000)
    locale: Locale = "vi-VN"
    due_at: datetime | None = None

class Submission(Model):
    assignment_id: UUID
    body: str = Field(min_length=1, max_length=5000)
    attachment_name: str | None = Field(default=None, max_length=120)
    attachment_base64: str | None = Field(default=None, max_length=1400000)

class Feedback(Model):
    class_id: UUID
    student_id: UUID
    capsule_id: UUID | None = None
    observed_action: str = Field(min_length=2, max_length=1500)
    next_step: str = Field(min_length=2, max_length=1500)
    skill: str = Field(min_length=2, max_length=120)
    locale: Locale = "vi-VN"

class Communication(Model):
    class_id: UUID | None = None
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=1, max_length=5000)

class Resource(Model):
    class_id: UUID | None = None
    title: str = Field(min_length=2, max_length=200)
    url: str = Field(min_length=8, max_length=2000, pattern=r"^https://")
    kind: Literal["document", "video", "link"]

class Payment(Model):
    student_id: UUID
    label: str = Field(min_length=2, max_length=200)
    amount_vnd: int = Field(ge=0, le=1000000000)

class Receipt(Model):
    reference: str = Field(min_length=3, max_length=200)

class Note(Model):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(max_length=4000)

class Support(Model):
    category: Literal["access", "learning", "content", "technical"]
    message: str = Field(min_length=2, max_length=2000)

class WorkflowRequest(Model):
    workflow: Literal["student_learning", "teacher_support", "partner_operations", "platform_support", "book_content"]
    locale: Locale = "vi-VN"
    book_id: UUID | None = None
