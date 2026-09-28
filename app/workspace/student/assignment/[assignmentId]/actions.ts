"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile, requireStudentClassAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { normalizeSubmissionId } from "@/lib/learning/idempotency";
import { learnerCanEditSubmission } from "@/lib/classroom/submission-policy";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(value: FormDataEntryValue | null, max = 12000) {
  return String(value || "").trim().slice(0, max);
}

async function requireAssignment(assignmentId: string) {
  if (!UUID_RE.test(assignmentId)) throw new Error("Invalid assignment.");
  const profile = await requireActiveProfile(["student"]);
  const sql = getDb();
  const rows = await sql`
    select a.id, a.class_id, a.status
    from assignments a
    join classes c on c.id=a.class_id and c.status='active'
    join organizations o on o.id=c.organization_id and o.status='active'
    where a.id=${assignmentId}
      and a.status='published'
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Assignment is not available.");
  await requireStudentClassAccess(String(row.class_id), profile);
  return { profile, classId: String(row.class_id), sql };
}

export async function saveAssignmentDraft(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  const text = textValue(formData.get("response"));
  const { profile, sql } = await requireAssignment(assignmentId);

  const current = await sql`
    select id, status
    from submissions
    where assignment_id=${assignmentId}
      and student_id=${profile.id}
    limit 1
  `;
  const status = current[0]?.status ? String(current[0].status) as "draft" | "submitted" | "returned" | "accepted" : null;
  if (!learnerCanEditSubmission(status)) throw new Error("This submission is waiting for teacher review or is already verified.");

  const rows = await sql`
    insert into submissions (assignment_id, student_id, response, status, submitted_at)
    values (
      ${assignmentId}, ${profile.id},
      ${JSON.stringify({ text })}::jsonb, 'draft', null
    )
    on conflict (assignment_id, student_id) do update set
      response=excluded.response,
      status='draft',
      submitted_at=null,
      updated_at=now()
    where submissions.status in ('draft','returned')
    returning id
  `;
  if (!rows[0]) throw new Error("This submission can no longer be edited.");

  revalidatePath(`/workspace/student/assignment/${assignmentId}`);
  revalidatePath("/workspace/student");
}

export async function submitAssignmentRevision(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") || "");
  const submissionKey = normalizeSubmissionId(formData.get("submissionKey"));
  const text = textValue(formData.get("response"));
  if (!submissionKey) throw new Error("Invalid submission key.");
  if (!text) throw new Error("Add your response before submitting.");

  const { profile, sql } = await requireAssignment(assignmentId);
  const rows = await sql`
    with locked as (
      select pg_advisory_xact_lock(
        hashtextextended(${`${assignmentId}:${profile.id}`}, 0)
      )
    ),
    existing as (
      select sr.id as revision_id, sr.revision_number, s.id as submission_id
      from submission_revisions sr
      join submissions s on s.id=sr.submission_id
      cross join locked
      where sr.submission_key=${submissionKey}::uuid
        and s.assignment_id=${assignmentId}
        and s.student_id=${profile.id}
      limit 1
    ),
    current_submission as (
      insert into submissions (
        assignment_id, student_id, response, status, submitted_at, current_revision
      )
      select
        ${assignmentId}, ${profile.id}, ${JSON.stringify({ text })}::jsonb,
        'submitted', now(), 1
      from locked
      where not exists (select 1 from existing)
      on conflict (assignment_id, student_id) do update set
        response=excluded.response,
        status='submitted',
        submitted_at=now(),
        updated_at=now(),
        current_revision=submissions.current_revision + 1
      where submissions.status in ('draft','returned')
      returning id, current_revision
    ),
    inserted_revision as (
      insert into submission_revisions (
        submission_id, revision_number, submission_key, response, submitted_at
      )
      select
        cs.id, cs.current_revision, ${submissionKey}::uuid,
        ${JSON.stringify({ text })}::jsonb, now()
      from current_submission cs
      on conflict (submission_key) do nothing
      returning id as revision_id, revision_number, submission_id
    )
    select revision_id, revision_number, submission_id from inserted_revision
    union all
    select revision_id, revision_number, submission_id from existing
    limit 1
  `;
  if (!rows[0]) throw new Error("This submission is not editable. Refresh to see its current teacher-review state.");

  revalidatePath(`/workspace/student/assignment/${assignmentId}`);
  revalidatePath("/workspace/student");
  revalidatePath("/workspace/teacher");
}
