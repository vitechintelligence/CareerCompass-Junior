import { NextResponse } from "next/server";
import { requireProfessorViStudentAccess } from "@/lib/professor-vi/access";
import { loadProfessorViInstitutionPolicy } from "@/lib/professor-vi/context";
import { deleteProfessorViSource, sourceHash, uploadProfessorViSource } from "@/lib/professor-vi/runtime";
import { getDb } from "@/lib/db";
import { AuthorizationError, requireActiveProfile, isUuidReference } from "@/lib/auth/authorization";
import { readBoundedForm, readBoundedJson } from "@/lib/learning/request-form";
import { sourceRetentionSeconds } from "@/lib/privacy/policy";

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
    await requireActiveProfile(["student"]);
    const form = await readBoundedForm(request);
    if(form.get('sourcePermission')!=='on' && form.get('sourcePermission')!=='true')return jsonError('source_permission_required',400);
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
    // Expired rows must leave the partial unique index before a retry can save.
    await sql`update ai_study_sources set status='expired'
      where learner_id=${profile.id} and organization_id=${organizationId} and source_hash=${hash}
        and status in ('uploading','ready') and expires_at<=now()`;

    const existing = await sql`
      select id, title, source_type, original_filename, created_at
      from ai_study_sources
      where learner_id=${profile.id}
        and organization_id=${organizationId}
        and source_hash=${hash}
        and status='ready'
        and (expires_at is null or expires_at>now())
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
          now() + make_interval(secs => ${sourceRetentionSeconds(policy.retentionDays)})
        )
        on conflict (learner_id,organization_id,source_hash) where status in ('uploading','ready') do nothing
        returning id, title, source_type, original_filename, created_at, expires_at
      `;
      if(!rows[0]){
        try{await deleteProfessorViSource(provider.id);}catch{/* The redundant file remains bounded by provider expiry. */}
        const winner=await sql`select id,title,source_type,original_filename,created_at,expires_at from ai_study_sources
          where learner_id=${profile.id} and organization_id=${organizationId} and source_hash=${hash}
            and status='ready' and (expires_at is null or expires_at>now()) limit 1`;
        if(!winner[0])return jsonError('study_source_metadata_save_failed',503);
        return NextResponse.json({ok:true,source:winner[0],deduplicated:true},{headers:{'Cache-Control':'no-store'}});
      }
      return NextResponse.json(
        { ok: true, source: rows[0], deduplicated: false },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      try{await deleteProfessorViSource(provider.id);}catch{/* Provider deletion failure remains subject to expiry and operational review. */}
      return jsonError("study_source_metadata_save_failed", 503);
    }
  } catch (error) {
    if(error instanceof AuthorizationError)return jsonError(error.code,error.status);
    if(error instanceof Error&&error.message==='request_body_too_large')return jsonError(error.message,413);
    const code = error instanceof Error ? error.message : "study_source_upload_failed";
    if(code==='request_origin_not_authorized')return jsonError(code,403);
    const forbidden = [
      "professor_vi_rollout_disabled", "school_processing_not_approved", "current_family_consent_required", "adult_synthetic_pilot_required", "intelligence_runtime_disabled", "governed_intelligence_not_connected",
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


export async function DELETE(request: Request) {
  try {
    const profile=await requireActiveProfile(["student"]);
    const body = await readBoundedJson(request);
    if(!body||typeof body!=='object'||Array.isArray(body))return jsonError('invalid_source_reference',400);
    const organizationId = String(body.organizationId || "");
    const sourceId = String(body.sourceId || "");
    if(!isUuidReference(organizationId)||!isUuidReference(sourceId))return jsonError('invalid_source_reference',400);
    const sql = getDb();

    const rows = await sql`
      select provider_file_id
      from ai_study_sources
      where id=${sourceId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
        and status<>'deleted'
      limit 1
    `;
    if (!rows[0]) return jsonError("study_source_not_available", 404);

    const providerFileId = rows[0].provider_file_id ? String(rows[0].provider_file_id) : "";
    if (providerFileId) {
      const deleted = await deleteProfessorViSource(providerFileId);
      if (!deleted) return jsonError("study_source_provider_delete_failed", 503);
    }

    await sql`
      update ai_study_sources
      set status='deleted', deleted_at=now(), provider_file_id=null
      where id=${sourceId}
        and learner_id=${profile.id}
        and organization_id=${organizationId}
    `;

    return NextResponse.json(
      { ok: true, sourceId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if(error instanceof AuthorizationError)return jsonError(error.code,error.status);
    if(error instanceof Error&&error.message==='request_body_too_large')return jsonError(error.message,413);
    const code = error instanceof Error ? error.message : "study_source_delete_failed";
    if(code==='request_origin_not_authorized')return jsonError(code,403);
    const forbidden = code.includes("disabled") || code.includes("not_authorized") || code.includes("not_available");
    return jsonError(forbidden ? code : "study_source_delete_failed", forbidden ? 403 : 503);
  }
}
