import { getDb } from "@/lib/db";
import type { IntegrationCapability } from "./adapter";

export type IntegrationProvider = {
  slug: string;
  displayName: string;
  category: string;
  protocol: string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  capabilities: IntegrationCapability[];
  status: string;
};

export async function listIntegrationProviders(): Promise<IntegrationProvider[]> {
  const sql = getDb();
  const rows = await sql`
    select slug, display_name, category, protocol, description_en, description_vi,
           capabilities, status
    from integration_providers
    where status in ('available', 'beta')
    order by category, display_name
  `;

  return rows.map((row) => ({
    slug: String(row.slug),
    displayName: String(row.display_name),
    category: String(row.category),
    protocol: String(row.protocol),
    descriptionEn: row.description_en ? String(row.description_en) : null,
    descriptionVi: row.description_vi ? String(row.description_vi) : null,
    capabilities: (row.capabilities ?? []) as IntegrationCapability[],
    status: String(row.status),
  }));
}

export async function getIntegrationHealth(organizationId: string) {
  const sql = getDb();
  return sql`
    select * from v_integration_health
    where organization_id = ${organizationId}::uuid
    order by provider_name
  `;
}
