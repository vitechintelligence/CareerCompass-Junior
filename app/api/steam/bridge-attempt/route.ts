import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isLearnerAgeBand } from "@/lib/learner-age-bands";
import { COMMUNITY_BRIDGE_MISSIONS } from "@/lib/steam-missions";
import { testBridge, validateBridgeDesign, type BridgeDesign } from "@/lib/steam/bridge-engine";
import { EvaluationError } from "@/lib/learning/objective-evaluation";
import { readBoundedJson } from "@/lib/learning/request-json";

export const dynamic = "force-dynamic";

type Payload = {
  ageBand?: string;
  design?: BridgeDesign;
  observation?: string;
  changeFromPrevious?: string;
  runMode?: "individual" | "small_group" | "large_group";
};

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    const value = await readBoundedJson(request, 32 * 1024);
    if (!value || typeof value !== "object" || Array.isArray(value)) return jsonError("Invalid payload.", 400);
    payload = value as Payload;
  } catch (error) {
    return jsonError(error instanceof EvaluationError ? error.code : "invalid_json", error instanceof EvaluationError ? error.status : 400);
  }

  if (!payload.ageBand || !isLearnerAgeBand(payload.ageBand)) {
    return jsonError("Assigned age level is required.", 400);
  }
  const missionDefinition = COMMUNITY_BRIDGE_MISSIONS[payload.ageBand];
  if (!validateBridgeDesign(payload.ageBand, payload.design, missionDefinition.constraints)) {
    return jsonError("Bridge design is outside this mission's limits.", 400);
  }
  const outcome = testBridge(payload.ageBand, payload.design);

  const profile = await getCurrentProfile();
  if (!profile || profile.account_type !== "student" || profile.status !== "active") {
    return jsonError("Sign in with a student account to sync STEAM evidence.", 401, { localOnly: true });
  }

  const sql = getDb();
  const ready = await sql`
    select
      to_regclass('public.steam_mission_runs') as runs,
      to_regclass('public.learner_delivery_profiles') as learner_profiles
  `;
  if (!ready[0]?.runs || !ready[0]?.learner_profiles) {
    return jsonError("STEAM sync is not activated in the production database yet.", 409, { localOnly: true });
  }

  let assignment = await sql`
    select ldp.organization_id, ldp.age_band,
      (select c.id
       from class_memberships cm
       join classes c on c.id=cm.class_id
       where cm.student_id=${profile.id}
         and cm.status='active'
         and c.status='active'
         and c.organization_id=ldp.organization_id
       order by cm.joined_at desc
       limit 1) as class_id
    from learner_delivery_profiles ldp
    where ldp.learner_id=${profile.id}
      and ldp.age_band=${payload.ageBand}
    order by ldp.updated_at desc
    limit 1
  `;

  if (!assignment[0]) {
    const fallback = await sql`
      select csa.organization_id, csa.age_band,
        (select c.id
         from class_memberships cm
         join classes c on c.id=cm.class_id
         where cm.student_id=${profile.id}
           and cm.status='active'
           and c.status='active'
           and c.organization_id=csa.organization_id
         order by cm.joined_at desc
         limit 1) as class_id
      from community_student_access csa
      where csa.student_id=${profile.id}
        and csa.status='enabled'
        and csa.age_band=${payload.ageBand}
      order by csa.updated_at desc
      limit 1
    `;
    assignment = fallback;
  }

  if (!assignment[0]) {
    return jsonError("Your school has not assigned this STEAM age level to your account.", 409, { localOnly: true });
  }

  const missionRows = await sql`
    insert into steam_missions (mission_key, title_en, title_vi, simulation_type, studios, status)
    values (
      ${missionDefinition.key}, ${missionDefinition.titleEn}, ${missionDefinition.titleVi},
      'bridge-builder', ${missionDefinition.studios}, 'published'
    )
    on conflict (mission_key) do update set
      title_en=excluded.title_en,
      title_vi=excluded.title_vi,
      simulation_type=excluded.simulation_type,
      studios=excluded.studios,
      status='published',
      updated_at=now()
    returning id
  `;
  const missionId = String(missionRows[0].id);

  const definitionJson = JSON.stringify(missionDefinition);
  const versionRows = await sql`
    insert into steam_mission_versions (mission_id, version_number, age_band, definition, status)
    values (${missionId}, 1, ${payload.ageBand}, ${definitionJson}::jsonb, 'published')
    on conflict (mission_id, version_number, age_band) do update set
      definition=excluded.definition,
      status='published'
    returning id
  `;
  const versionId = String(versionRows[0].id);
  const organizationId = String(assignment[0].organization_id);
  const classId = assignment[0].class_id ? String(assignment[0].class_id) : null;
  const runMode = ["small_group","large_group"].includes(String(payload.runMode)) ? payload.runMode! : "individual";

  let runRows = await sql`
    select id, attempt_count
    from steam_mission_runs
    where learner_id=${profile.id}
      and organization_id=${organizationId}
      and mission_id=${missionId}
      and mission_version_id=${versionId}
      and run_mode=${runMode}
      and status='in_progress'
    order by started_at desc
    limit 1
  `;

  if (!runRows[0]) {
    runRows = await sql`
      insert into steam_mission_runs (
        mission_id, mission_version_id, learner_id, organization_id, class_id,
        age_band, run_mode, status, current_step, attempt_count, career_connections
      )
      values (
        ${missionId}, ${versionId}, ${profile.id}, ${organizationId}, ${classId},
        ${payload.ageBand}, ${runMode}, 'in_progress', 'test', 0,
        ${JSON.stringify(missionDefinition.careerConnections)}::jsonb
      )
      returning id, attempt_count
    `;
  }

  const runId = String(runRows[0].id);
  const nextAttempt = Number(runRows[0].attempt_count || 0) + 1;
  const observation = typeof payload.observation === "string" ? payload.observation.slice(0, 1200) : "";
  const changeFromPrevious = typeof payload.changeFromPrevious === "string" ? payload.changeFromPrevious.slice(0, 1200) : "";
  const designJson = JSON.stringify(payload.design);
  const outcomeJson = JSON.stringify(outcome);
  const previousRows = await sql`
    select design_state, outcome from steam_attempts
    where run_id=${runId} order by attempt_number desc limit 1
  `;
  const previous = previousRows[0];
  const previousOutcome = previous?.outcome as Record<string, unknown> | undefined;
  const observedImprovement = Boolean(previous && changeFromPrevious.trim() &&
    JSON.stringify(previous.design_state) !== designJson &&
    typeof previousOutcome?.stability === "number" &&
    outcome.stability > previousOutcome.stability &&
    (typeof previousOutcome.cost !== "number" || outcome.cost <= previousOutcome.cost));

  const attemptRows = await sql`
    insert into steam_attempts (
      run_id, attempt_number, design_state, outcome, observation, change_from_previous, result_state
    )
    values (
      ${runId}, ${nextAttempt}, ${designJson}::jsonb, ${outcomeJson}::jsonb,
      ${observation || null}, ${changeFromPrevious || null}, ${outcome.resultState}
    )
    returning id
  `;
  const attemptId = String(attemptRows[0].id);

  // A simulated threshold is practice. A rubric/reviewer must evaluate the
  // explanation and creation before a child is labelled demonstrated or verified.
  const evidenceLabel = "practiced";

  for (const skill of outcome.skills) {
    await sql`
      insert into steam_skill_evidence (run_id, attempt_id, skill_key, evidence_label, evidence)
      values (
        ${runId}, ${attemptId}, ${String(skill).slice(0,80)}, ${evidenceLabel},
        ${JSON.stringify({ attemptNumber: nextAttempt, resultState: outcome.resultState, observedImprovement })}::jsonb
      )
    `;
  }

  const skillSummary = JSON.stringify({
    latestAttempt: nextAttempt,
    latestEvidenceLabel: evidenceLabel,
    skills: outcome.skills,
    observedImprovement,
  });
  await sql`
    update steam_mission_runs
    set attempt_count=${nextAttempt},
        current_step=${outcome.resultState === "stable" ? "explain" : "improve"},
        skill_summary=${skillSummary}::jsonb,
        updated_at=now()
    where id=${runId}
  `;

  const capsuleSemanticId = `${profile.semantic_id}-steam-${missionDefinition.key}-${organizationId}-${attemptId}`.toLowerCase();
  const capsuleEvidence = JSON.stringify({
    missionKey: missionDefinition.key,
    ageBand: payload.ageBand,
    attemptCount: nextAttempt,
    latestResult: outcome.resultState,
    latestSkills: outcome.skills,
    observedImprovement,
    attemptId,
    note: "Observed STEAM practice evidence; not a psychological diagnosis or career prediction.",
  });
  await sql`
    insert into learning_capsules (
      semantic_id, learner_id, organization_id, class_id, source_type, source_id,
      title_en, title_vi, evidence_summary, skill_tags, mastery_level,
      status, sharing_scope, achieved_on
    )
    values (
      ${capsuleSemanticId}, ${profile.id}, ${organizationId}, ${classId},
      'project', ${runId}, ${missionDefinition.titleEn}, ${missionDefinition.titleVi},
      ${capsuleEvidence}::jsonb, ${outcome.skills}, ${evidenceLabel},
      'draft', 'learner', current_date
    )
    on conflict (semantic_id) do nothing
  `;

  return NextResponse.json({
    ok: true,
    synced: true,
    runId,
    attemptNumber: nextAttempt,
    evidenceLabel,
    outcome,
    observedImprovement,
  }, { headers: { "Cache-Control": "no-store" } });
}
