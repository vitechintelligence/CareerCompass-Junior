import { NextResponse } from "next/server";
import { AuthorizationError, requireActiveProfile, requireStudentClassAccess } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { isLearnerAgeBand } from "@/lib/learner-age-bands";
import { COMMUNITY_BRIDGE_MISSIONS } from "@/lib/steam-missions";
import { testBridge, validateBridgeDesign, type BridgeDesign } from "@/lib/steam/bridge-engine";
import { EvaluationError } from "@/lib/learning/objective-evaluation";
import { readBoundedJson } from "@/lib/learning/request-json";
import { enforceLearningWriteQuota, LearningWriteQuotaError } from "@/lib/learning/write-quota";

export const dynamic = "force-dynamic";

type Payload = {
  ageBand?: string;
  design?: BridgeDesign;
  observation?: string;
  changeFromPrevious?: string;
  runMode?: "individual" | "small_group" | "large_group";
  submissionId?: string;
};

type ReflectionPayload = {
  ageBand?: string;
  runId?: string;
  reflection?: string;
  explanation?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  let profile;
  try {
    profile = await requireActiveProfile(["student"]);
  } catch {
    return jsonError("Sign in with an active student account to load STEAM history.", 401);
  }

  const url = new URL(request.url);
  const ageBand = url.searchParams.get("ageBand") || "";
  if (!isLearnerAgeBand(ageBand)) return jsonError("Assigned age level is required.", 400);

  const missionDefinition = COMMUNITY_BRIDGE_MISSIONS[ageBand];
  const sql = getDb();
  const runRows = await sql`
    select r.id, r.status, r.current_step, r.attempt_count, r.reflection, r.explanation
    from steam_mission_runs r
    join steam_missions m on m.id=r.mission_id
    where r.learner_id=${profile.id}
      and r.age_band=${ageBand}
      and m.mission_key=${missionDefinition.key}
      and r.status in ('in_progress','completed')
    order by r.updated_at desc
    limit 1
  `;
  const run = runRows[0];
  if (!run) {
    return NextResponse.json({ ok: true, run: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const attempts = await sql`
    select attempt_number, design_state, outcome, observation, change_from_previous, result_state, created_at
    from steam_attempts
    where run_id=${String(run.id)}
    order by attempt_number
  `;

  return NextResponse.json({
    ok: true,
    run: {
      id: String(run.id),
      status: String(run.status),
      currentStep: String(run.current_step),
      attemptCount: Number(run.attempt_count || 0),
      reflection: typeof run.reflection === "string" ? run.reflection : "",
      explanation: typeof run.explanation === "string" ? run.explanation : "",
      attempts: attempts.map((item) => ({
        number: Number(item.attempt_number),
        design: item.design_state,
        outcome: item.outcome,
        observation: item.observation,
        changeFromPrevious: item.change_from_previous,
        resultState: item.result_state,
        createdAt: item.created_at,
      })),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  let payload: ReflectionPayload;
  try {
    const value = await readBoundedJson(request, 16 * 1024);
    if (!value || typeof value !== "object" || Array.isArray(value)) return jsonError("Invalid payload.", 400);
    payload = value as ReflectionPayload;
  } catch (error) {
    return jsonError(error instanceof EvaluationError ? error.code : "invalid_json", error instanceof EvaluationError ? error.status : 400);
  }

  const ageBand = typeof payload.ageBand === "string" ? payload.ageBand : "";
  const runId = typeof payload.runId === "string" ? payload.runId : "";
  const reflection = typeof payload.reflection === "string" ? payload.reflection.trim().slice(0, 1200) : "";
  const explanation = typeof payload.explanation === "string" ? payload.explanation.trim().slice(0, 3000) : "";
  if (!isLearnerAgeBand(ageBand) || !UUID_RE.test(runId)) return jsonError("Valid mission run and age level are required.", 400);

  let profile;
  try {
    profile = await requireActiveProfile(["student"]);
  } catch {
    return jsonError("Sign in with an active student account to save STEAM reflection.", 401);
  }

  const missionDefinition = COMMUNITY_BRIDGE_MISSIONS[ageBand];
  const sql = getDb();
  const rows = await sql`
    select r.id, r.organization_id, r.class_id, r.attempt_count
    from steam_mission_runs r
    join steam_missions m on m.id=r.mission_id
    where r.id=${runId}
      and r.learner_id=${profile.id}
      and r.age_band=${ageBand}
      and m.mission_key=${missionDefinition.key}
      and r.status in ('in_progress','completed')
      and (
        (r.organization_id is null and r.class_id is null)
        or exists (
          select 1 from organization_memberships om
          join organizations o on o.id=om.organization_id and o.status='active'
          where om.organization_id=r.organization_id
            and om.profile_id=r.learner_id and om.role='student' and om.status='active'
        )
      )
    limit 1
  `;
  const run = rows[0];
  if (!run) return jsonError("STEAM mission run not found.", 404);
  if (run.class_id) {
    try {
      const scope = await requireStudentClassAccess(String(run.class_id), profile);
      if (scope.organizationId !== String(run.organization_id)) return jsonError("STEAM mission run not found.", 404);
    } catch (error) {
      if (error instanceof AuthorizationError) return jsonError("STEAM mission run not found.", 404);
      throw error;
    }
  }

  try {
    await enforceLearningWriteQuota({
      profileId: profile.id,
      organizationId: run.organization_id ? String(run.organization_id) : null,
      resource: "steam",
    });
  } catch (error) {
    if (error instanceof LearningWriteQuotaError) return jsonError(error.code, error.status);
    throw error;
  }

  const complete = Number(run.attempt_count || 0) > 0 && Boolean(reflection) && Boolean(explanation);
  const saved = await sql`
    update steam_mission_runs r
    set
      reflection=${reflection || null},
      explanation=${explanation || null},
      current_step=${complete ? "reflect" : "explain"},
      status=${complete ? "completed" : "in_progress"},
      completed_at=case when ${complete} then coalesce(completed_at, now()) else null end,
      updated_at=now()
    where id=${runId}
      and learner_id=${profile.id}
      and (
        (r.organization_id is null and r.class_id is null)
        or exists (
          select 1 from organization_memberships om
          join organizations o on o.id=om.organization_id and o.status='active'
          where om.organization_id=r.organization_id
            and om.profile_id=r.learner_id and om.role='student' and om.status='active'
            and (r.class_id is null or exists (
              select 1 from class_memberships cm
              join classes c on c.id=cm.class_id and c.status='active'
              where cm.class_id=r.class_id and cm.student_id=r.learner_id
                and cm.status='active' and c.organization_id=r.organization_id
            ))
        )
      )
    returning id
  `;
  if (!saved[0]) return jsonError("STEAM mission run not found.", 404);

  return NextResponse.json({
    ok: true,
    saved: true,
    complete,
    evidenceSet: {
      attemptRecorded: Number(run.attempt_count || 0) > 0,
      reflectionRecorded: Boolean(reflection),
      explanationRecorded: Boolean(explanation),
    },
  }, { headers: { "Cache-Control": "no-store" } });
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
  const submissionId = typeof payload.submissionId === "string" ? payload.submissionId : "";
  if (!UUID_RE.test(submissionId)) return jsonError("A valid STEAM submission ID is required.", 400);
  const missionDefinition = COMMUNITY_BRIDGE_MISSIONS[payload.ageBand];
  if (!validateBridgeDesign(payload.ageBand, payload.design, missionDefinition.constraints)) {
    return jsonError("Bridge design is outside this mission's limits.", 400);
  }
  const outcome = testBridge(payload.ageBand, payload.design);

  let profile;
  try {
    profile = await requireActiveProfile(["student"]);
  } catch {
    return jsonError("Sign in with an active student account to sync STEAM evidence.", 401, { localOnly: true });
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

  const duplicateRows = await sql`
    select sa.id, sa.attempt_number, sa.outcome, r.id as run_id
    from steam_attempts sa
    join steam_mission_runs r on r.id=sa.run_id
    where sa.submission_id=${submissionId}::uuid
      and r.learner_id=${profile.id}
    limit 1
  `;
  if (duplicateRows[0]) {
    return NextResponse.json({
      ok: true,
      synced: true,
      duplicate: true,
      runId: String(duplicateRows[0].run_id),
      attemptNumber: Number(duplicateRows[0].attempt_number),
      evidenceLabel: "practiced",
      outcome: duplicateRows[0].outcome,
    }, { headers: { "Cache-Control": "no-store" } });
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
    join organizations o on o.id=ldp.organization_id and o.status='active'
    join organization_memberships om
      on om.organization_id=ldp.organization_id
     and om.profile_id=ldp.learner_id
     and om.role='student'
     and om.status='active'
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
      join organizations o on o.id=csa.organization_id and o.status='active'
      join organization_memberships om
        on om.organization_id=csa.organization_id
       and om.profile_id=csa.student_id
       and om.role='student'
       and om.status='active'
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
  try {
    await enforceLearningWriteQuota({
      profileId: profile.id,
      organizationId,
      submissionId,
      resource: "steam",
    });
  } catch (error) {
    if (error instanceof LearningWriteQuotaError) return jsonError(error.code, error.status);
    throw error;
  }
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
      on conflict (learner_id, organization_id, mission_id, mission_version_id, run_mode)
        where status='in_progress'
      do nothing
      returning id, attempt_count
    `;
    if (!runRows[0]) {
      runRows = await sql`
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
    }
  }

  const runId = String(runRows[0].id);
  const observation = typeof payload.observation === "string" ? payload.observation.slice(0, 1200) : "";
  const changeFromPrevious = typeof payload.changeFromPrevious === "string" ? payload.changeFromPrevious.slice(0, 1200) : "";
  const designJson = JSON.stringify(payload.design);
  const outcomeJson = JSON.stringify(outcome);

  const attemptRows = await sql`
    with locked as (
      select pg_advisory_xact_lock(hashtextextended(${runId}, 0))
    ),
    state as (
      select r.attempt_count
      from steam_mission_runs r
      cross join locked
      where r.id=${runId}
        and r.learner_id=${profile.id}
        and r.status='in_progress'
    ),
    inserted as (
      insert into steam_attempts (
        run_id, attempt_number, design_state, outcome, observation,
        change_from_previous, result_state, submission_id
      )
      select
        ${runId}, state.attempt_count + 1, ${designJson}::jsonb, ${outcomeJson}::jsonb,
        ${observation || null}, ${changeFromPrevious || null}, ${outcome.resultState},
        ${submissionId}::uuid
      from state
      on conflict (submission_id) where submission_id is not null do nothing
      returning id, attempt_number
    ),
    updated as (
      update steam_mission_runs r
      set attempt_count=inserted.attempt_number, updated_at=now()
      from inserted
      where r.id=${runId}
      returning r.id
    )
    select inserted.id, inserted.attempt_number
    from inserted
  `;
  if (!attemptRows[0]) {
    const duplicate = await sql`
      select sa.id, sa.attempt_number, sa.outcome, sa.run_id
      from steam_attempts sa
      join steam_mission_runs r on r.id=sa.run_id
      where sa.submission_id=${submissionId}::uuid
        and r.learner_id=${profile.id}
      limit 1
    `;
    if (duplicate[0]) {
      return NextResponse.json({
        ok: true,
        synced: true,
        duplicate: true,
        runId: String(duplicate[0].run_id),
        attemptNumber: Number(duplicate[0].attempt_number),
        evidenceLabel: "practiced",
        outcome: duplicate[0].outcome,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return jsonError("steam_submission_conflict", 409);
  }

  const attemptId = String(attemptRows[0].id);
  const nextAttempt = Number(attemptRows[0].attempt_number);
  const previousRows = await sql`
    select design_state, outcome
    from steam_attempts
    where run_id=${runId}
      and attempt_number < ${nextAttempt}
    order by attempt_number desc
    limit 1
  `;
  const previous = previousRows[0];
  const previousOutcome = previous?.outcome as Record<string, unknown> | undefined;
  const observedImprovement = Boolean(previous && changeFromPrevious.trim() &&
    JSON.stringify(previous.design_state) !== designJson &&
    typeof previousOutcome?.stability === "number" &&
    outcome.stability > previousOutcome.stability &&
    (typeof previousOutcome.cost !== "number" || outcome.cost <= previousOutcome.cost));

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
