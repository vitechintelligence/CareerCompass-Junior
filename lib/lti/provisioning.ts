import "server-only";

import { getDb } from "@/lib/db";
import { LTI_CLAIMS } from "@/lib/lti/constants";
import { ltiRoleKind, normalizeExternalId, stableHash } from "@/lib/lti/policy";
import type { JwtPayload } from "@/lib/lti/crypto";
import type { LtiPlatformRegistration } from "@/lib/lti/runtime";

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function displayName(payload: JwtPayload) {
  const explicit = normalizeExternalId(payload.name, 80);
  if (explicit) return explicit;
  const combined = [payload.given_name, payload.family_name]
    .map((value) => normalizeExternalId(value, 40))
    .filter(Boolean)
    .join(" ")
    .trim();
  return combined || null;
}

export async function provisionLtiActor(
  registration: LtiPlatformRegistration,
  payload: JwtPayload,
) {
  const externalSub = normalizeExternalId(payload.sub, 500);
  if (!externalSub) throw new Error("lti_subject_missing");

  const roles = payload[LTI_CLAIMS.roles];
  const launchedRole = ltiRoleKind(roles);
  const sql = getDb();

  const links = await sql`
    select p.id, p.auth_subject, p.display_name, p.account_type, p.status
    from external_identity_links eil
    join profiles p on p.id=eil.profile_id
    where eil.installation_id=${registration.installationId}
      and eil.external_user_id=${externalSub}
    limit 1
  `;

  let profile = links[0] as Record<string, unknown> | undefined;
  if (!profile) {
    const subjectHash = stableHash(`${registration.installationId}:${externalSub}`);
    const authSubject = `lti:${registration.installationId}:${subjectHash.slice(0, 32)}`;
    const semanticId = `lti-user-${subjectHash.slice(0, 24)}`;
    const created = await sql`
      insert into profiles (
        semantic_id, auth_subject, display_name, preferred_locale, account_type, status
      ) values (
        ${semanticId}, ${authSubject}, ${displayName(payload)}, 'en', ${launchedRole}, 'active'
      )
      on conflict (auth_subject) do update set
        display_name=coalesce(excluded.display_name, profiles.display_name),
        updated_at=now()
      returning id, auth_subject, display_name, account_type, status
    `;
    profile = created[0] as Record<string, unknown> | undefined;
    if (!profile) throw new Error("lti_profile_provision_failed");

    await sql`
      insert into external_identity_links (
        installation_id, profile_id, external_user_id, external_role
      ) values (
        ${registration.installationId}, ${String(profile.id)}, ${externalSub}, ${launchedRole}
      )
      on conflict (installation_id, external_user_id) do update set
        profile_id=excluded.profile_id,
        external_role=excluded.external_role
    `;
  }

  if (String(profile.status) !== "active") throw new Error("lti_profile_inactive");

  if (launchedRole === "teacher" && String(profile.account_type) === "student") {
    const promoted = await sql`
      update profiles
      set account_type='teacher', updated_at=now()
      where id=${String(profile.id)} and status='active' and account_type='student'
      returning id, auth_subject, display_name, account_type, status
    `;
    if (promoted[0]) profile = promoted[0] as Record<string, unknown>;
  }

  const organizationRole = launchedRole === "teacher" ? "teacher" : "student";
  await sql`
    insert into organization_memberships (organization_id, profile_id, role, status)
    values (${registration.organizationId}, ${String(profile.id)}, ${organizationRole}, 'active')
    on conflict (organization_id, profile_id, role) do update set status='active'
  `;

  const context = record(payload[LTI_CLAIMS.context]);
  const externalContextId = normalizeExternalId(context.id, 500);
  let classId: string | null = null;

  if (externalContextId) {
    const existing = await sql`
      select class_id
      from lti_context_links
      where registration_id=${registration.id}
        and external_context_id=${externalContextId}
      limit 1
    `;
    classId = existing[0]?.class_id ? String(existing[0].class_id) : null;

    if (!classId) {
      const contextHash = stableHash(`${registration.id}:${externalContextId}`);
      const contextTitle =
        normalizeExternalId(context.title, 180) ||
        normalizeExternalId(context.label, 180) ||
        "LTI class";
      const classes = await sql`
        insert into classes (
          organization_id, semantic_id, name, class_scope, status
        ) values (
          ${registration.organizationId}, ${`lti-class-${contextHash.slice(0, 24)}`},
          ${contextTitle}, 'program', 'active'
        )
        on conflict (semantic_id) do update set
          name=excluded.name,
          status='active',
          updated_at=now()
        returning id
      `;
      classId = classes[0]?.id ? String(classes[0].id) : null;
      if (!classId) throw new Error("lti_class_provision_failed");

      await sql`
        insert into lti_context_links (
          registration_id, external_context_id, class_id, context_label, context_title
        ) values (
          ${registration.id}, ${externalContextId}, ${classId},
          ${normalizeExternalId(context.label, 180) || null},
          ${normalizeExternalId(context.title, 180) || null}
        )
        on conflict (registration_id, external_context_id) do update set
          class_id=excluded.class_id,
          context_label=excluded.context_label,
          context_title=excluded.context_title,
          updated_at=now()
      `;
    }

    if (launchedRole === "teacher") {
      await sql`
        insert into teacher_assignments (class_id, teacher_id, assignment_role)
        values (${classId}, ${String(profile.id)}, 'teacher')
        on conflict (class_id, teacher_id) do nothing
      `;
    } else {
      await sql`
        insert into class_memberships (class_id, student_id, status)
        values (${classId}, ${String(profile.id)}, 'active')
        on conflict (class_id, student_id) do update set status='active'
      `;
    }
  }

  return {
    profileId: String(profile.id),
    authSubject: String(profile.auth_subject),
    accountType: String(profile.account_type),
    launchedRole,
    classId,
    externalContextId: externalContextId || null,
  };
}
