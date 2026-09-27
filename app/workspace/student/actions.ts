"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile, isUuidReference } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";

async function changeInvitation(organizationId: string, nextStatus: "active" | "inactive") {
  if (!isUuidReference(organizationId)) throw new Error("Invalid institution invitation.");
  const profile = await requireActiveProfile(["student"]);
  const sql = getDb();
  const rows = await sql`
    update organization_memberships om
    set status=${nextStatus}, joined_at=case when ${nextStatus}='active' then now() else om.joined_at end
    from organizations o
    where om.organization_id=${organizationId}
      and om.profile_id=${profile.id}
      and om.role='student'
      and om.status='invited'
      and o.id=om.organization_id
      and o.status='active'
    returning om.organization_id
  `;
  if (!rows[0]) throw new Error("This institution invitation is no longer available.");
  revalidatePath("/workspace/student");
  revalidatePath("/workspace/partner");
}

export async function acceptOrganizationInvitation(formData: FormData) {
  await changeInvitation(String(formData.get("organizationId") || ""), "active");
}

export async function declineOrganizationInvitation(formData: FormData) {
  await changeInvitation(String(formData.get("organizationId") || ""), "inactive");
}
