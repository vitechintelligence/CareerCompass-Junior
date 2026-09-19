import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { safeIntegrationConfig } from "@/lib/integration-adapter-core";

export type ManagedOrganization = { id: string; name: string };

export async function getManagedOrganization(requestedOrganizationId?: string | null) {
  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) return null;

  const sql = getDb();
  if (profile.account_type === "platform_admin") {
    const rows = requestedOrganizationId
      ? await sql`select id, name from organizations where id=${requestedOrganizationId} and status='active' limit 1`
      : await sql`select id, name from organizations where status='active' order by name limit 1`;
    if (!rows[0]) return null;
    return {
      profile,
      organization: { id: String(rows[0].id), name: String(rows[0].name) } as ManagedOrganization,
    };
  }

  const rows = requestedOrganizationId
    ? await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id = om.organization_id
        where om.profile_id=${profile.id} and om.role='partner_admin' and om.status='active'
          and o.status='active' and o.id=${requestedOrganizationId}
        limit 1
      `
    : await sql`
        select o.id, o.name
        from organization_memberships om
        join organizations o on o.id = om.organization_id
        where om.profile_id=${profile.id} and om.role='partner_admin' and om.status='active'
          and o.status='active'
        order by o.name
        limit 1
      `;
  if (!rows[0]) return null;
  return {
    profile,
    organization: { id: String(rows[0].id), name: String(rows[0].name) } as ManagedOrganization,
  };
}

export function safeConfig(input: unknown) {
  return safeIntegrationConfig(input);
}
