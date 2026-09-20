import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isLearnerAgeBand } from "@/lib/learner-age-bands";
import { COMMUNITY_BRIDGE_MISSIONS } from "@/lib/steam-missions";
import type { BridgeDesign, BridgeOutcome } from "@/lib/steam/bridge-engine";

export const dynamic = "force-dynamic";

type Payload = {
  ageBand?: string;
  design?: BridgeDesign;
  outcome?: BridgeOutcome;
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
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON payload.", 400);
  }

  if (!payload.ageBand || !isLearnerAgeBand(payload.ageBand) || !payload.design || !payload.outcome) {
    return jsonError("Age level, bridge design and outcome are required.", 400);
  }

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

  const missionDefinition = COMMUNITY_BRIDGE_MISSIONS[payload.ageBand];
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
  const observation = String(payload.observation || payload.outcome.observations?.[0] || "").slice(0, 1200);
  const changeFromPrevious = String(payload.changeFromPrevious || "").slice(0, 1200);
  const designJson = JSON.stringify(payload.design);
  const outcomeJson = JSON.stringify(payload.outcome);

  const attemptRows = await sql`
    insert into steam_attempts (
      run_id, attempt_number, design_state, outcome, observation, change_from_previous, result_state
    )
    values (
      ${runId}, ${nextAttempt}, ${designJson}::jsonb, ${outcomeJson}::jsonb,
      ${observation || null}, ${changeFromPrevious || null}, ${payload.outcome.resultState}
    )
    returning id
  `;
  const attemptId = String(attemptRows[0].id);

  const evidenceLabel = nextAttempt > 1
    ? "improved"
    : payload.outcome.resultState === "stable"
      ? "demonstrated"
      : "practiced";

  for (const skill of (payload.outcome.skills || []).slice(0, 20)) {
    await sql`
      insert into steam_skill_evidence (run_id, attempt_id, skill_key, evidence_label, evidence)
      values (
        ${runId}, ${attemptId}, ${String(skill).slice(0,80)}, ${evidenceLabel},
        ${JSON.stringify({ attemptNumber: nextAttempt, resultState: payload.outcome.resultState })}::jsonb
      )
    `;
  }

  const skillSummary = JSON.stringify({
    latestAttempt: nextAttempt,
    latestEvidenceLabel: evidenceLabel,
    skills: payload.outcome.skills || [],
  });
  await sql`
    update steam_mission_runs
    set attempt_count=${nextAttempt},
        current_step=${payload.outcome.resultState === "stable" ? "explain" : "improve"},
        skill_summary=${skillSummary}::jsonb,
        updated_at=now()
    where id=${runId}
  `;

  const capsuleSemanticId = `${profile.semantic_id}-steam-${missionDefinition.key}-${organizationId}`.toLowerCase();
  const capsuleEvidence = JSON.stringify({
    missionKey: missionDefinition.key,
    ageBand: payload.ageBand,
    attemptCount: nextAttempt,
    latestResult: payload.outcome.resultState,
    latestSkills: payload.outcome.skills || [],
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
      ${capsuleEvidence}::jsonb, ${payload.outcome.skills || []}, ${evidenceLabel},
      'draft', 'learner', current_date
    )
    on conflict (semantic_id) do update set
      source_id=excluded.source_id,
      evidence_summary=excluded.evidence_summary,
      skill_tags=excluded.skill_tags,
      mastery_level=excluded.mastery_level,
      updated_at=now()
  `;

  return NextResponse.json({
    ok: true,
    synced: true,
    runId,
    attemptNumber: nextAttempt,
    evidenceLabel,
  }, { headers: { "Cache-Control": "no-store" } });
}
