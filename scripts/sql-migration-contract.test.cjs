const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { splitSql, rehearsalRequest, restoreDrillRequest, assertRestoreIsolation } = require('./sql-migration-contract.cjs');

test('dollar-quoted constraint bodies remain a single statement', () => {
  const sql = "ALTER TABLE x ADD COLUMN y text; DO $$ BEGIN RAISE NOTICE 'x;y'; END $$; SELECT 1;";
  assert.equal(splitSql(sql).length, 3);
  assert.match(splitSql(sql)[1], /END \$\$;$/);
});

const production = { id: 'br-shiny-meadow-b3ibu54h', name: 'production', primary: true, default: true, protected: false };
const target = { id: 'br-disposable-drill', name: 'isolated-restore-target', primary: false, default: false, protected: false };
const endpoint = { id: 'ep-damp-bonus-b300sxd5', branch_id: production.id };
const drill = overrides => restoreDrillRequest({ projectId: 'royal-queen-79814128', snapshotId: 'snap-controlled-drill',
  targetBranchId: target.id, disposable: true, branches: [production, target], endpoints: [endpoint], ...overrides });
test('restore drills require an explicit target and always disable finalization', () => {
  const result = drill();
  assert.equal(result.request.finalize, false);
  assert.equal(result.request.target_branch_id, target.id);
  for (const overrides of [{ targetBranchId: undefined }, { targetBranchId: production.id }, { disposable: false },
    { branches: [production, { ...target, primary: true }] }, { branches: [production, { ...target, protected: true }] }]) {
    assert.throws(() => drill(overrides), /non-production restore target/);
  }
});
test('restore drills stop if the project or production endpoint is already wrong', () => {
  assert.throws(() => drill({ projectId: 'different-project' }), /Unexpected CCJ project/);
  assert.throws(() => drill({ endpoints: [{ ...endpoint, branch_id: target.id }] }), /Production identity/);
});
test('restore readback rejects the observed production swap and endpoint move', () => {
  const { baseline } = drill();
  const restoredBranch = { id: 'br-restored-copy', primary: false, default: false, restore_status: 'restored', restored_as: target.id };
  assert.equal(assertRestoreIsolation({ baseline, branches: [production, target], endpoints: [endpoint], restoredBranch }), true);
  assert.throws(() => assertRestoreIsolation({ baseline, branches: [{ ...production, primary: false }, target],
    endpoints: [endpoint], restoredBranch }), /Production branch identity/);
  assert.throws(() => assertRestoreIsolation({ baseline, branches: [production, target],
    endpoints: [{ ...endpoint, branch_id: restoredBranch.id }], restoredBranch }), /Endpoint binding changed/);
});
test('restore readback refuses a finalized copy or a source selected instead of the disposable target', () => {
  const { baseline } = drill();
  for (const restoredBranch of [
    { primary: false, default: false, restore_status: 'finalized', restored_as: target.id },
    { primary: false, default: false, restore_status: 'restored', restored_as: production.id },
  ]) assert.throws(() => assertRestoreIsolation({ baseline, branches: [production, target], endpoints: [endpoint], restoredBranch }), /target\/finalization/);
});
test('tagged bodies, comments and quoted identifiers do not split early', () => {
  const sql = '-- ;\n SELECT "a;b"; /* outer ; /* nested ; */ */ DO $tag$ BEGIN PERFORM 1; END $tag$;';
  assert.equal(splitSql(sql).length, 2);
});
test('escaped SQL quotes and trailing comment-only input are preserved safely', () => {
  assert.deepEqual(splitSql("SELECT 'a'';b'; -- only ;\n /* only ; */"), ["SELECT 'a'';b';"]);
  assert.deepEqual(splitSql(' -- only ;\n'), []);
});
test('incomplete SQL is rejected before any request is emitted', () => {
  for (const sql of ["SELECT 'unfinished", 'SELECT "unfinished', 'DO $$ BEGIN;', '/* unfinished']) {
    assert.throws(() => splitSql(sql), /Unterminated/);
  }
});
test('exact migration 014 keeps both constraint blocks and all 22 statements', () => {
  const request = rehearsalRequest(path.join(__dirname, '../db/migrations/014_operational_closeout.sql'));
  assert.equal(request.statement_count, 22);
  assert.match(request.sql_statements[2], /teacher_learning_progress_evidence_status_check/);
  assert.match(request.sql_statements[2], /integration_sync_jobs_max_attempts_check/);
  assert.match(request.sql_statements[0], /lock_timeout/);
});
test('015 and 016 produce bounded atomic rehearsal requests with honest lock metrics', () => {
  for (const name of ['015_professor_vi_report_cards.sql', '016_privacy_governance.sql']) {
    const request = rehearsalRequest(path.join(__dirname, '../db/migrations', name));
    assert.ok(request.statement_count > 0);
    assert.match(request.sha256, /^[a-f0-9]{64}$/);
    assert.match(request.sql_statements[2], /'lock_duration_measured',false/);
    assert.match(request.sql_statements[3], /current_setting/);
    if (name.startsWith('016')) {
      assert.equal(request.standalone_transaction_wrapper, true);
      assert.equal(request.statement_count, 10);
      assert.equal(request.atomic_execution, 'outer runner transaction');
    } else assert.equal(request.standalone_transaction_wrapper, false);
  }
});
