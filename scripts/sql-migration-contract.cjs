const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

// Preserve the checked-in SQL. Split only top-level semicolons, including the
// dollar-quoted constraint blocks used by migration 014.
function splitSql(source) {
  const statements = [];
  let start = 0, state = 'code', tag = '', depth = 0, hasCode = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i], next = source[i + 1];
    if (state === 'line') { if (char === '\n') state = 'code'; continue; }
    if (state === 'block') {
      if (char === '/' && next === '*') { depth += 1; i += 1; }
      else if (char === '*' && next === '/') { depth -= 1; i += 1; if (!depth) state = 'code'; }
      continue;
    }
    if (state === 'dollar') {
      if (source.startsWith(tag, i)) { i += tag.length - 1; state = 'code'; }
      continue;
    }
    if (state === 'single' || state === 'double') {
      const quote = state === 'single' ? "'" : '"';
      if (char === quote && next === quote) i += 1;
      else if (char === quote) state = 'code';
      continue;
    }
    if (char === '-' && next === '-') { state = 'line'; i += 1; continue; }
    if (char === '/' && next === '*') { state = 'block'; depth = 1; i += 1; continue; }
    if (char === ';') {
      if (hasCode) statements.push(source.slice(start, i + 1).trim());
      start = i + 1; hasCode = false; continue;
    }
    if (/\s/.test(char)) continue;
    hasCode = true;
    if (char === "'") state = 'single';
    else if (char === '"') state = 'double';
    else if (char === '$') {
      const match = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);
      if (match) { tag = match[0]; state = 'dollar'; i += tag.length - 1; }
    }
  }
  if (!['code', 'line'].includes(state)) throw new Error(`Unterminated SQL ${state}`);
  if (hasCode) statements.push(source.slice(start).trim());
  return statements;
}

function rehearsalRequest(file) {
  const source = fs.readFileSync(file, 'utf8');
  let statements = splitSql(source);
  if (!statements.length) throw new Error('Empty migration');
  // 016 includes its own BEGIN/COMMIT for standalone execution. The MCP runner
  // already wraps the batch atomically, so use that same outer transaction.
  const code = statement => statement.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '').trim();
  const explicitTransaction = /^BEGIN\s*;?$/i.test(code(statements[0]));
  if (explicitTransaction) {
    if (!/^COMMIT\s*;?$/i.test(code(statements.at(-1)))) throw new Error('Unbalanced migration transaction wrapper');
    statements = statements.slice(1, -1);
  }
  if (!statements.length) throw new Error('Empty migration transaction');
  if (statements.some(statement => /^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|START\s+TRANSACTION)\b/i.test(code(statement)))) {
    throw new Error('Unsupported internal transaction control');
  }
  const payload = JSON.stringify(statements);
  if (payload.includes('$ccj_statements$') || source.includes('$ccj_rehearsal$')) throw new Error('Migration delimiter collision');
  const name = path.basename(file);
  const digest = crypto.createHash('sha256').update(source).digest('hex');
  const block = `DO $ccj_rehearsal$
DECLARE
  migration_started timestamptz := clock_timestamp();
  statement_started timestamptz;
  statement_sql text;
  ordinal integer := 0;
  measurements jsonb := '[]'::jsonb;
  held_locks jsonb;
BEGIN
  FOR statement_sql IN SELECT jsonb_array_elements_text($ccj_statements$${payload}$ccj_statements$::jsonb)
  LOOP
    ordinal := ordinal + 1;
    statement_started := clock_timestamp();
    EXECUTE statement_sql;
    measurements := measurements || jsonb_build_array(jsonb_build_object(
      'statement', ordinal, 'duration_ms', extract(epoch from clock_timestamp()-statement_started)*1000));
  END LOOP;
  SELECT coalesce(jsonb_agg(jsonb_build_object('relation',c.relname,'mode',l.mode,'granted',l.granted) ORDER BY c.relname,l.mode),'[]'::jsonb)
    INTO held_locks FROM pg_locks l JOIN pg_class c ON c.oid=l.relation
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE l.pid=pg_backend_pid() AND n.nspname='public';
  PERFORM set_config('ccj.rehearsal_metrics',jsonb_build_object(
    'migration','${name.replaceAll("'", "''")}','sha256','${digest}',
    'statement_count',ordinal,'server_ddl_duration_ms',extract(epoch from clock_timestamp()-migration_started)*1000,
    'statements',measurements,'held_locks_before_commit',held_locks,
    'lock_duration_measured',false)::text,true);
END
$ccj_rehearsal$;`;
  return { migration: name, sha256: digest, statement_count: statements.length,
    standalone_transaction_wrapper: explicitTransaction, atomic_execution: 'outer runner transaction',
    sql_statements: ["SET LOCAL lock_timeout='5s'", "SET LOCAL statement_timeout='60s'", block,
      "SELECT current_setting('ccj.rehearsal_metrics')::jsonb AS rehearsal_metrics"] };
}

// A snapshot may refer to the production source even when a new name is given.
// Never finalize a drill. Require an explicit disposable target, then verify
// both branch flags and endpoint bindings before considering any further action.
const productionProjectId = 'royal-queen-79814128';
const productionBranchId = 'br-shiny-meadow-b3ibu54h';
const productionEndpointId = 'ep-damp-bonus-b300sxd5';
function restoreDrillRequest({ projectId, snapshotId, targetBranchId, disposable, branches, endpoints }) {
  if (projectId !== productionProjectId) throw new Error('Unexpected CCJ project');
  if (!/^snap-[a-z0-9-]+$/.test(snapshotId || '')) throw new Error('Invalid snapshot reference');
  const target = branches.find(branch => branch.id === targetBranchId);
  if (!disposable || !target || target.id === productionBranchId || target.primary !== false
      || target.default !== false || target.protected !== false || /^prod(?:uction)?(?:$|[-_ ])/i.test(target.name)) {
    throw new Error('An explicitly disposable non-production restore target is required');
  }
  const production = branches.find(branch => branch.id === productionBranchId);
  const endpoint = endpoints.find(item => item.id === productionEndpointId);
  if (!production?.primary || !production.default || endpoint?.branch_id !== productionBranchId) {
    throw new Error('Production identity must be correct before a drill');
  }
  return {
    request: { project_id: projectId, snapshot_id: snapshotId, target_branch_id: targetBranchId, finalize: false },
    baseline: { productionBranchId, productionName: production.name, targetBranchId,
      endpointBindings: endpoints.map(item => ({ id: item.id, branch_id: item.branch_id })) },
  };
}
function assertRestoreIsolation({ baseline, branches, endpoints, restoredBranch }) {
  const production = branches.find(branch => branch.id === baseline.productionBranchId);
  if (!production?.primary || !production.default || production.name !== baseline.productionName) {
    throw new Error('Production branch identity changed during restore');
  }
  for (const before of baseline.endpointBindings) {
    if (endpoints.find(item => item.id === before.id)?.branch_id !== before.branch_id) {
      throw new Error(`Endpoint binding changed during restore: ${before.id}`);
    }
  }
  if (restoredBranch.primary !== false || restoredBranch.default !== false
      || restoredBranch.restore_status === 'finalized'
      || restoredBranch.restored_as !== baseline.targetBranchId) {
    throw new Error('Restore target/finalization does not match the isolated drill');
  }
  return true;
}

module.exports = { splitSql, rehearsalRequest, restoreDrillRequest, assertRestoreIsolation };
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Pass the exact migration file; execute output only on the approved rehearsal branch.');
  process.stdout.write(JSON.stringify(rehearsalRequest(process.argv[2])) + '\n');
}
