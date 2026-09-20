"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { TEACHER_UPSKILL_MODULES } from "@/lib/teacher-upskill-catalog";

const VALID_KEYS = new Set(TEACHER_UPSKILL_MODULES.map((module) => module.key));

export async function updateTeacherLearningProgress(formData: FormData) {
  const moduleKey = String(formData.get("moduleKey") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!VALID_KEYS.has(moduleKey) || !["not_started", "in_progress", "completed"].includes(status)) {
    throw new Error("Invalid professional learning update.");
  }

  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "platform_admin"].includes(profile.account_type)) {
    throw new Error("Teacher access required.");
  }

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
