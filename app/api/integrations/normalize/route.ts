import { NextResponse } from "next/server";
import { getManagedOrganization } from "@/lib/integration-runtime";
import { getEducationAdapter } from "@/lib/provider-adapters";

export const dynamic = "force-dynamic";

const OBJECT_TYPES = new Set(["person", "class", "enrollment", "event"]);

export async function POST(request: Request) {
  let payload: { organizationId?: string; providerSlug?: string; objectType?: string; data?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const access = await getManagedOrganization(payload.organizationId ?? null);
  if (!access) return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });

  const providerSlug = typeof payload.providerSlug === "string" ? payload.providerSlug.trim() : "generic";
  const objectType = typeof payload.objectType === "string" ? payload.objectType : "";
  if (!OBJECT_TYPES.has(objectType) || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    return NextResponse.json({ error: "objectType and object data are required." }, { status: 400 });
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

  return NextResponse.json({ ok: true, provider: adapter.provider, objectType, normalized });
}
