import { NextResponse } from "next/server";
import { requireProfessorViStudentAccess } from "@/lib/professor-vi/access";
import { loadProfessorViInstitutionPolicy } from "@/lib/professor-vi/context";
import { sourceHash, uploadProfessorViSource } from "@/lib/professor-vi/runtime";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["pdf","ppt","pptx","txt","md","doc","docx"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function extension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const organizationId = String(form.get("organizationId") || "");
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("study_source_file_required", 400);

    const { profile } = await requireProfessorViStudentAccess(organizationId);
    const policy = await loadProfessorViInstitutionPolicy(organizationId);
    if (!policy.enabled || !policy.allowSourceUploads) return jsonError("study_source_uploads_disabled", 403);

    const sourceType = extension(file.name);
    if (!ALLOWED_EXTENSIONS.has(sourceType) || !policy.allowedSourceTypes.includes(sourceType)) {
      return jsonError("study_source_type_not_allowed", 415);
    }
    if (file.size < 1 || file.size > policy.maxSourceBytes) {
      return jsonError("study_source_size_not_allowed", 413);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const hash = sourceHash(bytes);
    const sql = getDb();

    const existing = await sql`
      select id, title, source_type, original_filename, created_at
      from ai_study_sources
      where learner_id=${profile.id}
        and organization_id=${organizationId}
        and source_hash=${hash}
        and status='ready'
      limit 1
    `;
    if (existing[0]) {
      return NextResponse.json(
        { ok: true, source: existing[0], deduplicated: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const provider = await uploadProfessorViSource(file, policy.retentionDays);
    const title = String(form.get("title") || file.name || "Study source").trim().slice(0, 200);

    try {
      const rows = await sql`
        insert into ai_study_sources (
          learner_id, organization_id, title, source_type, original_filename,
          mime_type, provider, provider_file_id, source_hash, bytes, status, expires_at
        )
        values (
          ${profile.id}, ${organizationId}, ${title}, ${sourceType}, ${file.name.slice(0, 255)},
          ${file.type || null}, 'openai', ${provider.id}, ${hash}, ${file.size}, 'ready',
          now() + make_interval(days => ${policy.retentionDays})
        )
        returning id, title, source_type, original_filename, created_at, expires_at
      `;
      return NextResponse.json(
        { ok: true, source: rows[0], deduplicated: false },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return jsonError("study_source_metadata_save_failed", 503);
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "study_source_upload_failed";
    const forbidden = [
      "professor_vi_rollout_disabled",
      "professor_vi_not_authorized",
      "professor_vi_ai_not_available",
      "platform_managed_ai_unavailable",
      "organization_ai_disabled",
      "local_ai_only",
      "byok_not_configured",
      "byok_runtime_not_connected",
    ].some((item) => code.includes(item));
    return jsonError(forbidden ? code : "study_source_upload_failed", forbidden ? 403 : 503);
  }
}
