import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { validateCanonicalObject, type CanonicalObjectType } from "@/lib/integration-adapter-core";
import { getEducationAdapter, hasDedicatedEducationAdapter } from "@/lib/provider-adapters";

export const dynamic = "force-dynamic";

const OBJECT_TYPES = new Set<CanonicalObjectType>(["person", "class", "enrollment", "event"]);
const PROVIDER_RE = /^[a-z0-9-]{2,80}$/;

export async function POST(request: Request) {
  let payload: { organizationId?: string; providerSlug?: string; objectType?: string; data?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) {
    return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  }

  const providerSlug = typeof payload.providerSlug === "string" ? payload.providerSlug.trim().toLowerCase() : "";
  const objectType = typeof payload.objectType === "string" ? payload.objectType as CanonicalObjectType : "";

  if (!PROVIDER_RE.test(providerSlug)) {
    return NextResponse.json({ error: "A valid providerSlug is required." }, { status: 400 });
  }
  if (!OBJECT_TYPES.has(objectType) || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    return NextResponse.json({ error: "objectType and object data are required." }, { status: 400 });
  }

  const sql = getDb();
  const providers = await sql`
    select slug, display_name, protocol, status
    from integration_providers
    where slug=${providerSlug} and status in ('available','beta')
    limit 1
  `;
  const provider = providers[0];
  if (!provider) {
    return NextResponse.json({ error: "Integration provider is not available." }, { status: 404 });
  }

  const adapter = getEducationAdapter(providerSlug);
  const data = payload.data as Record<string, unknown>;
  const normalized = objectType === "person"
    ? adapter.normalizePerson(data)
    : objectType === "class"
      ? adapter.normalizeClass(data)
      : objectType === "enrollment"
        ? adapter.normalizeEnrollment(data)
        : adapter.normalizeLearningEvent(data);

  const validation = validateCanonicalObject(objectType, normalized);
  if (!validation.ok) {
    return NextResponse.json({
      error: "Adapter produced an invalid canonical object.",
      provider: adapter.provider,
      objectType,
      validation,
      normalized,
    }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    provider: adapter.provider,
    providerName: String(provider.display_name),
    protocol: String(provider.protocol),
    adapterMode: hasDedicatedEducationAdapter(providerSlug) ? "dedicated" : "canonical-generic",
    objectType,
    validation,
    normalized,
  });
}
