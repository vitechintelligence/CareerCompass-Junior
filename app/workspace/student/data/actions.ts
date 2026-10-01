"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";

export async function requestDeletionReview() {
  const profile = await requireActiveProfile(["student"]);
  if (!isRiskyFeatureEnabled("deletionReview")) {
    throw new Error("Deletion review requests are currently disabled.");
  }
  const sql = getDb();

  const orgs = await sql`
    select organization_id
    from organization_memberships
    where profile_id=${profile.id}
      and role='student'
      and status='active'
    order by joined_at desc
    limit 1
  `;
  const organizationId = orgs[0]?.organization_id ? String(orgs[0].organization_id) : null;

  const existing = await sql`
    select id
    from data_lifecycle_requests
    where learner_id=${profile.id}
      and request_type='deletion_review'
      and status in ('requested','in_review')
    limit 1
  `;
  if (!existing[0]) {
    await sql`
      insert into data_lifecycle_requests (
        organization_id, learner_id, requested_by, request_type, status, scope
      )
      values (
        ${organizationId}, ${profile.id}, ${profile.id},
        'deletion_review', 'requested',
        ${JSON.stringify({
          requestedByLearner: true,
          automaticDeletion: false,
          note: "Requires review of institutional retention, evidence and account relationships before any destructive action.",
        })}::jsonb
      )
    `;
  }

  revalidatePath("/workspace/student/data");
}
