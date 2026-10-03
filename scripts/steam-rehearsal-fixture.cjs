// Actual database constraint exercise; use only the approved rehearsal branch.
// The fixture subtransaction rolls back all records, including on assertion failure.
const fs = require('node:fs');
const path = require('node:path');
const sql = `DO $steam_fixture$
DECLARE
  learner uuid := '70000000-0000-4000-8000-000000000001';
  tenant_a uuid := '70000000-0000-4000-8000-000000000002';
  tenant_b uuid := '70000000-0000-4000-8000-000000000003';
  mission uuid := '70000000-0000-4000-8000-000000000004';
  version uuid := '70000000-0000-4000-8000-000000000005';
  run_a uuid := '70000000-0000-4000-8000-000000000006';
  run_b uuid := '70000000-0000-4000-8000-000000000007';
  submission uuid := '70000000-0000-4000-8000-000000000008';
  offending_constraint text;
  passed integer := 0;
BEGIN
  IF EXISTS(SELECT 1 FROM profiles WHERE id=learner)
     OR EXISTS(SELECT 1 FROM organizations WHERE id IN (tenant_a,tenant_b))
     OR EXISTS(SELECT 1 FROM steam_missions WHERE id=mission) THEN
    RAISE EXCEPTION 'steam_fixture_identifier_collision';
  END IF;
  BEGIN
    INSERT INTO profiles(id,semantic_id,account_type,status)
      VALUES(learner,'rehearsal-synthetic-steam-profile','student','active');
    INSERT INTO organizations(id,semantic_id,name,organization_type,status) VALUES
      (tenant_a,'rehearsal-synthetic-steam-tenant-a','Synthetic internal A','internal','active'),
      (tenant_b,'rehearsal-synthetic-steam-tenant-b','Synthetic internal B','internal','active');
    INSERT INTO steam_missions(id,mission_key,title_en,title_vi,simulation_type,status)
      VALUES(mission,'rehearsal-synthetic-steam-mission','Synthetic mission','Synthetic mission','bridge-builder','published');
    INSERT INTO steam_mission_versions(id,mission_id,version_number,age_band,status)
      VALUES(version,mission,1,'14-16','published');
    -- Existing code may omit all three nullable 014 fields.
    INSERT INTO steam_mission_runs(id,mission_id,mission_version_id,learner_id,organization_id,age_band)
      VALUES(run_a,mission,version,learner,tenant_a,'14-16');
    IF NOT EXISTS(SELECT 1 FROM steam_mission_runs WHERE id=run_a AND reflection IS NULL AND explanation IS NULL) THEN
      RAISE EXCEPTION 'legacy_run_insert_changed';
    END IF;
    passed := passed+1;
    BEGIN
      INSERT INTO steam_mission_runs(mission_id,mission_version_id,learner_id,organization_id,age_band)
        VALUES(mission,version,learner,tenant_a,'14-16');
      RAISE EXCEPTION 'duplicate_active_context_accepted';
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS offending_constraint = CONSTRAINT_NAME;
      IF offending_constraint <> 'idx_steam_runs_active_context' THEN RAISE; END IF;
    END;
    passed := passed+1;
    INSERT INTO steam_mission_runs(id,mission_id,mission_version_id,learner_id,organization_id,age_band)
      VALUES(run_b,mission,version,learner,tenant_b,'14-16');
    IF (SELECT count(*) FROM steam_mission_runs WHERE learner_id=learner AND status='in_progress')<>2 THEN
      RAISE EXCEPTION 'distinct_tenant_context_rejected';
    END IF;
    passed := passed+1;
    -- Legacy attempts with no submission ID keep their existing behavior.
    INSERT INTO steam_attempts(run_id,attempt_number) VALUES(run_a,1),(run_a,2);
    IF (SELECT count(*) FROM steam_attempts WHERE run_id=run_a AND submission_id IS NULL)<>2 THEN
      RAISE EXCEPTION 'legacy_null_submission_changed';
    END IF;
    passed := passed+1;
    INSERT INTO steam_attempts(run_id,attempt_number,submission_id) VALUES(run_a,3,submission);
    BEGIN
      INSERT INTO steam_attempts(run_id,attempt_number,submission_id) VALUES(run_b,1,submission);
      RAISE EXCEPTION 'duplicate_submission_accepted';
    EXCEPTION WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS offending_constraint = CONSTRAINT_NAME;
      IF offending_constraint <> 'idx_steam_attempts_submission_id' THEN RAISE; END IF;
    END;
    passed := passed+1;
    UPDATE steam_mission_runs SET reflection='Synthetic revision',explanation='Synthetic explanation' WHERE id=run_a;
    IF NOT EXISTS(SELECT 1 FROM steam_mission_runs WHERE id=run_a AND reflection='Synthetic revision' AND explanation='Synthetic explanation') THEN
      RAISE EXCEPTION 'new_fields_not_persisted';
    END IF;
    passed := passed+1;
    UPDATE steam_mission_runs SET status='completed',completed_at=now() WHERE id=run_a;
    INSERT INTO steam_mission_runs(mission_id,mission_version_id,learner_id,organization_id,age_band)
      VALUES(mission,version,learner,tenant_a,'14-16');
    IF (SELECT count(*) FROM steam_mission_runs WHERE learner_id=learner AND organization_id=tenant_a AND status='in_progress')<>1 THEN
      RAISE EXCEPTION 'completed_history_blocks_new_active_run';
    END IF;
    passed := passed+1;
    RAISE EXCEPTION 'ROLLBACK_STEAM_REHEARSAL_FIXTURE';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'ROLLBACK_STEAM_REHEARSAL_FIXTURE' THEN RAISE; END IF;
  END;
  IF passed<>7 THEN RAISE EXCEPTION 'steam_fixture_assertion_count_wrong'; END IF;
  PERFORM set_config('ccj.steam_fixture_count',passed::text,true);
END $steam_fixture$;`;
const final = `SELECT current_setting('ccj.steam_fixture_count')::int AS assertions_passed,
  (SELECT count(*) FROM profiles WHERE semantic_id='rehearsal-synthetic-steam-profile') AS remaining_synthetic_profiles,
  (SELECT count(*) FROM organizations WHERE semantic_id LIKE 'rehearsal-synthetic-steam-tenant-%') AS remaining_synthetic_organizations,
  (SELECT count(*) FROM steam_missions WHERE mission_key='rehearsal-synthetic-steam-mission') AS remaining_synthetic_missions;`;
const request = { assertions: 7, sql_statements: ["SET LOCAL lock_timeout='5s'", "SET LOCAL statement_timeout='60s'", sql, final] };
module.exports = request;
if (require.main === module) {
  const output = path.resolve(__dirname, '../.privacy-test/steam-rehearsal-fixture.sql');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, request.sql_statements.join('\n')+'\n');
  process.stdout.write(JSON.stringify({ ...request, path: output })+'\n');
}
