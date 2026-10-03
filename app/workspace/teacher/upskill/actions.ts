"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { TEACHER_UPSKILL_MODULES } from "@/lib/teacher-upskill-catalog";

const VALID_KEYS = new Set(TEACHER_UPSKILL_MODULES.map((module) => module.key));

export async function updateTeacherLearningProgress(formData: FormData) {
  const moduleKey = String(formData.get("moduleKey") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!VALID_KEYS.has(moduleKey) || !["not_started", "in_progress", "completed"].includes(status)) {
    throw new Error("Invalid professional learning update.");
  }

  const profile = await requireActiveProfile(["teacher", "platform_admin"]);

  const completionPercent = status === "completed" ? 100 : status === "in_progress" ? 50 : 0;
  const sql = getDb();
  await sql`
    insert into teacher_learning_progress (
      teacher_id, module_key, status, completion_percent, started_at, completed_at, updated_at
    )
    values (
      ${profile.id}, ${moduleKey}, ${status}, ${completionPercent},
      case when ${status} in ('in_progress','completed') then now() else null end,
      case when ${status} = 'completed' then now() else null end,
      now()
    )
    on conflict (teacher_id, module_key) do update set
      status = excluded.status,
      completion_percent = excluded.completion_percent,
      started_at = case
        when teacher_learning_progress.started_at is null and excluded.status in ('in_progress','completed') then now()
        else teacher_learning_progress.started_at
      end,
      completed_at = case when excluded.status='completed' then now() else null end,
      updated_at = now()
  `;

  revalidatePath("/workspace/teacher/upskill");
  revalidatePath("/workspace/teacher");
}


export async function submitTeacherLearningEvidence(formData: FormData) {
  const moduleKey = String(formData.get("moduleKey") || "").trim();
  const artifact = String(formData.get("artifact") || "").trim().slice(0, 10000);
  const reflection = String(formData.get("reflection") || "").trim().slice(0, 4000);
  if (!VALID_KEYS.has(moduleKey) || !artifact || !reflection) {
    throw new Error("Module, artifact and reflection are required.");
  }

  const profile = await requireActiveProfile(["teacher", "platform_admin"]);
  const sql = getDb();
  const rows = await sql`
    select status
    from teacher_learning_progress
    where teacher_id=${profile.id}
      and module_key=${moduleKey}
    limit 1
  `;
  if (String(rows[0]?.status || "") !== "completed") {
    throw new Error("Complete the module participation before submitting professional evidence.");
  }

  await sql`
    update teacher_learning_progress
    set
      evidence=${JSON.stringify({
        artifact,
        reflection,
        submittedAt: new Date().toISOString(),
      })}::jsonb,
      evidence_status='submitted',
      reviewed_by=null,
      reviewed_at=null,
      review_notes=null,
      updated_at=now()
    where teacher_id=${profile.id}
      and module_key=${moduleKey}
  `;

  revalidatePath("/workspace/teacher/upskill");
  revalidatePath("/workspace/admin/teacher-evidence");
}

export async function reviewTeacherLearningEvidence(formData: FormData) {
  const teacherId = String(formData.get("teacherId") || "");
  const moduleKey = String(formData.get("moduleKey") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const notes = String(formData.get("notes") || "").trim().slice(0, 4000);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teacherId) ||
    !VALID_KEYS.has(moduleKey) ||
    !["verified", "changes_requested"].includes(decision) ||
    !notes
  ) {
    throw new Error("Teacher, module, review decision and notes are required.");
  }

  const { profile: reviewer } = await requirePlatformAdmin();
  const sql = getDb();
  const updated = await sql`
    update teacher_learning_progress
    set
      evidence_status=${decision},
      reviewed_by=${reviewer.id},
      reviewed_at=now(),
      review_notes=${notes},
      updated_at=now()
    where teacher_id=${teacherId}
      and module_key=${moduleKey}
      and evidence_status in ('submitted','changes_requested')
      and coalesce(evidence, '{}'::jsonb) <> '{}'::jsonb
    returning teacher_id
  `;
  if (!updated[0]) throw new Error("Submitted teacher evidence was not found.");

  revalidatePath("/workspace/admin/teacher-evidence");
  revalidatePath("/workspace/teacher/upskill");
}
