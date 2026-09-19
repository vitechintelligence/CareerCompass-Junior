import { getDb } from "@/lib/db";
import {
  type IntegrationCapability,
  type IntegrationProtocol,
} from "./integration-adapter-core";

export {
  genericEducationAdapter,
  normalizeRole,
  safeIntegrationConfig,
  safeIntegrationMetadata,
  validateCanonicalObject,
} from "./integration-adapter-core";
export type {
  AdapterValidationResult,
  CanonicalClass,
  CanonicalEnrollment,
  CanonicalLearningEvent,
  CanonicalObjectType,
  CanonicalPerson,
  EducationIntegrationAdapter,
  IntegrationCapability,
  IntegrationProtocol,
} from "./integration-adapter-core";

export type IntegrationProvider = {
  id: string;
  slug: string;
  displayName: string;
  category: string;
  protocol: IntegrationProtocol | string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  capabilities: IntegrationCapability[];
  status: string;
};

export async function listIntegrationProviders(): Promise<IntegrationProvider[]> {
  const sql = getDb();
  const rows = await sql`
    select id, slug, display_name, category, protocol, description_en, description_vi, capabilities, status
    from integration_providers
    where status in ('available', 'beta')
    order by category, display_name
  `;
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    category: String(row.category),
    protocol: String(row.protocol),
    descriptionEn: row.description_en ? String(row.description_en) : null,
    descriptionVi: row.description_vi ? String(row.description_vi) : null,
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.map(String) as IntegrationCapability[] : [],
    status: String(row.status),
  }));
}

export async function listOrganizationIntegrations(organizationId: string) {
  const sql = getDb();
  return sql`
    select i.id, i.display_label, i.status, i.health_state, i.last_health_at, i.last_error,
           p.slug as provider_slug, p.display_name as provider_name, p.protocol, p.category
    from integration_installations i
    join integration_providers p on p.id = i.provider_id
    where i.organization_id = ${organizationId}
    order by p.display_name, i.display_label
  `;
}

export const integrationStandards = [
  { name: "LTI 1.3", purpose: "SSO, secure content launch and grade passback", examples: "Moodle, Canvas" },
  { name: "OneRoster", purpose: "Classes, teachers, students and enrollments", examples: "SIS / school databases" },
  { name: "SCORM", purpose: "Launch packaged learning modules", examples: "Existing courseware" },
  { name: "xAPI", purpose: "Export learning events to an LRS", examples: "Analytics / evidence systems" },
  { name: "REST + Webhooks", purpose: "Custom partner apps and event exchange", examples: "School portals, custom modules" },
  { name: "OAuth 2.0", purpose: "Authorized third-party APIs", examples: "Google Classroom, Microsoft Teams, Zoom" },
] as const;
