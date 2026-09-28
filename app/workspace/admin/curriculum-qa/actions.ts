"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { buildActivityContract } from "@/lib/learning/activity-contract";
import { normalizeQaStatus, qaApprovalAllowed, qaContractChecks } from "@/lib/qa/curriculum-qa-policy";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(value: FormDataEntryValue | null, max: number) {
  return String(value || "").trim().slice(0, max);
}

export async function updateActivityQa(formData: FormData) {
  const { profile: admin } = await requirePlatformAdmin();
  const activityId = String(formData.get("activityId") || "");
  const status = normalizeQaStatus(formData.get("status"));
  const notes = textValue(formData.get("notes"), 3000);
  if (!UUID_RE.test(activityId) || !status) throw new Error("Invalid curriculum QA update.");

  const sql = getDb();
  const rows = await sql`
    select
      a.id, a.code, a.activity_type, a.content, a.content_version,
      a.instructions_en, a.instructions_vi,
      b.code as book_code, b.age_band, b.level_label,
      bu.code as unit_code, bu.objective_en, bu.objective_vi
    from activities a
    join book_units bu on bu.id=a.unit_id
    join books b on b.id=bu.book_id
    where a.id=${activityId}
    limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Activity not found.");

  const contract = buildActivityContract({
    activityId: String(row.id),
    activityCode: String(row.code),
    courseId: String(row.book_code),
    unitId: String(row.unit_code),
    activityType: String(row.activity_type),
    contentVersion: Number(row.content_version || 1),
    ageBand: row.age_band ? String(row.age_band) : null,
    englishLevel: row.level_label ? String(row.level_label) : null,
    objectiveEn: row.objective_en ? String(row.objective_en) : null,
    objectiveVi: row.objective_vi ? String(row.objective_vi) : null,
    instructionsEn: row.instructions_en ? String(row.instructions_en) : null,
    instructionsVi: row.instructions_vi ? String(row.instructions_vi) : null,
    content: row.content,
  });

  if (status === "approved") {
    const checks = qaContractChecks(contract);
    const requiresAnswer = ["single_choice", "sequence", "matching"].includes(contract.inputType);
    if (!qaApprovalAllowed(checks, requiresAnswer)) {
      throw new Error("This activity cannot be approved until its required contract fields and authoritative answer are complete.");
    }
  }

  await sql`
    update activities
    set
      qa_status=${status},
      qa_notes=${notes || null},
      qa_reviewed_by=${admin.id},
      qa_reviewed_at=now(),
      updated_at=now()
    where id=${activityId}
  `;

  await sql`
    insert into admin_audit_events (
      actor_profile_id, event_type, target_type, target_id, detail
    )
    values (
      ${admin.id}, 'curriculum_qa_status', 'activity', ${activityId},
      ${JSON.stringify({ status, notes, contentVersion: contract.contentVersion })}::jsonb
    )
  `;

  revalidatePath("/workspace/admin/curriculum-qa");
  revalidatePath(`/workspace/admin/curriculum-qa/${activityId}`);
}
