"use server";

import { revalidatePath } from "next/cache";
import { requireProfessorViTeacherAccess } from "@/lib/professor-vi/access";
import { getDb } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewProfessorViPack(formData: FormData) {
  const organizationId = String(formData.get("organizationId") || "");
  const packId = String(formData.get("packId") || "");
  const decision = String(formData.get("decision") || "");
  const reviewNote = String(formData.get("reviewNote") || "").trim().slice(0, 2000);
  if (!UUID_RE.test(organizationId) || !UUID_RE.test(packId)) throw new Error("invalid_review_reference");
  if (!["release","changes_requested"].includes(decision)) throw new Error("invalid_review_decision");

  const { profile } = await requireProfessorViTeacherAccess(organizationId);
  const sql = getDb();

  const rows = profile.account_type === "platform_admin"
    ? await sql`
        select p.id, p.pack_type
        from ai_study_packs p
        where p.id=${packId}
          and p.organization_id=${organizationId}
          and p.review_status in ('pending_review','approved','changes_requested')
        limit 1
      `
    : await sql`
        select p.id, p.pack_type
        from ai_study_packs p
        where p.id=${packId}
          and p.organization_id=${organizationId}
          and p.review_status in ('pending_review','approved','changes_requested')
          and exists (
            select 1
            from teacher_assignments ta
            join class_memberships cm on cm.class_id=ta.class_id
            join classes c on c.id=ta.class_id
            where ta.teacher_id=${profile.id}
              and cm.student_id=p.learner_id
              and cm.status='active'
              and c.status='active'
              and c.organization_id=${organizationId}
          )
        limit 1
      `;
  if (!rows[0]) throw new Error("pack_review_not_authorized");

  const nextStatus = decision === "release" ? "released" : "changes_requested";
  await sql.transaction((txn) => [
    txn`
      update ai_study_packs
      set review_status=${nextStatus},
          reviewed_by=${profile.id},
          reviewed_at=now(),
          review_note=${reviewNote || null},
          updated_at=now()
      where id=${packId}
        and organization_id=${organizationId}
    `,
    txn`
      update ai_generated_activities
      set status=${decision === "release" ? "released" : "draft"}
      where pack_id=${packId}
        and organization_id=${organizationId}
    `,
  ]);

  revalidatePath("/workspace/teacher/ai-learning");
  revalidatePath("/workspace/student/ai-study");
}
