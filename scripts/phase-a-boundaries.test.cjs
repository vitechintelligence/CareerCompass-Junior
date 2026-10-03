// Runs real modules with an in-memory session/provider boundary; never connects to Neon.
// This is regression evidence, not a substitute for authenticated HTTP acceptance.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function loader(mocks, env = {}) {
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const loadedModule = { exports: {} }; cache.set(resolved, loadedModule);
    const source = process.env.PHASE_A_SOURCE_REF
      ? execFileSync('git', ['show', `${process.env.PHASE_A_SOURCE_REF}:${path.relative(root, resolved)}`], { cwd: root, encoding: 'utf8' })
      : fs.readFileSync(resolved, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: resolved,
    }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return resolve(name.slice(2));
      if (name.startsWith('.')) return resolve(path.relative(root, path.resolve(path.dirname(resolved), name)));
      return require(name);
    };
    function resolve(base) {
      for (const suffix of ['', '.ts', '.tsx']) {
        if (fs.existsSync(path.join(root, base + suffix))) return load(base + suffix);
      }
      throw new Error(`Missing test module: ${base}`);
    }
    vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, require: localRequire,
      process: { env }, URL, Response, Request, Headers, FormData, TextDecoder, TextEncoder, console, Buffer, setTimeout }, { filename: resolved });
    return loadedModule.exports;
  }
  return load;
}

const prodEndpoint = 'ep-damp-bonus-b300sxd5';
function authEnv() { return { NODE_ENV: 'production', VERCEL_ENV: 'preview',
  NEON_PROJECT_ID: 'royal-queen-79814128', NEON_BRANCH_ID: 'br-test-only',
  DATABASE_URL: 'postgresql://fake:fake@ep-test-only.neon.tech/neondb',
  NEON_AUTH_BASE_URL: 'https://ep-test-only.neonauth.test/neondb/auth',
  NEON_AUTH_COOKIE_SECRET: 'synthetic-test-only-secret-32-characters' }; }

for (const environment of ['preview', 'development', 'test']) {
  for (const source of ['branch', 'database', 'auth']) {
    test(`${environment} blocks production ${source} at both auth and database boundaries`, () => {
      const env = authEnv();
      env.VERCEL_ENV = environment === 'test' ? '' : environment;
      env.NODE_ENV = environment === 'test' ? 'test' : 'production';
      if (source === 'branch') env.NEON_BRANCH_ID = 'br-shiny-meadow-b3ibu54h';
      if (source === 'database') env.DATABASE_URL = `postgresql://fake:fake@${prodEndpoint}-pooler.neon.tech/neondb`;
      if (source === 'auth') env.NEON_AUTH_BASE_URL = `https://${prodEndpoint}.neonauth.test/auth`;
      let providerCalls = 0;
      const load = loader({ '@neondatabase/auth/next/server': { createNeonAuth() { providerCalls++; return {}; } } }, env);
      const server = load('lib/auth/server.ts');
      assert.equal(server.getAuthConfigurationStatus().configured, false);
      assert.equal(server.getAuth(), null);
      assert.equal(providerCalls, 0);
      assert.throws(() => load('lib/runtime-alignment.ts').assertNoKnownProductionProjectMismatch());
    });
  }
}

test('cached auth cannot bypass a newly blocking configuration', () => {
  const env = authEnv(); let calls = 0;
  const server = loader({ '@neondatabase/auth/next/server': { createNeonAuth() { calls++; return { synthetic: true }; } } }, env)('lib/auth/server.ts');
  assert.ok(server.getAuth());
  env.NEON_BRANCH_ID = 'br-shiny-meadow-b3ibu54h';
  assert.equal(server.getAuth(), null);
  assert.equal(calls, 1);
});

const learner = { id: '10000000-0000-4000-8000-000000000001', semantic_id: 'test-learner-a', status: 'active', account_type: 'student' };
const foreignLearner = '10000000-0000-4000-8000-000000000002';
const responses = { NextResponse: class extends Response { static json(body, init) { return new Response(JSON.stringify(body), init); } } };

for (const role of ['anonymous', 'teacher', 'partner_admin', 'platform_admin', 'inactive_student']) {
  test(`export denies ${role} before reading any learning records`, async () => {
    let reads = 0;
    const profile = role === 'anonymous' ? null : { ...learner, account_type: role === 'inactive_student' ? 'student' : role,
      status: role === 'inactive_student' ? 'suspended' : 'active' };
    const load = loader({ 'next/server': responses, '@/lib/auth/profile': { getCurrentProfile: async () => profile },
      '@/lib/db': { getDb() { reads++; throw Error('Unexpected database access'); } } }, { CCJ_FEATURE_LEARNER_DATA_EXPORT: 'true' });
    const result = await load('app/api/account/export/route.ts').GET();
    assert.equal(result.status, role === 'anonymous' ? 401 : 403);
    assert.match(result.headers.get('Cache-Control'), /no-store/);
    assert.equal(reads, 0);
  });
}

test('export ignores foreign learner/tenant parameters and binds every query to the session subject', async () => {
  const queries = [];
  const sql = async (parts, ...values) => { queries.push({ text: parts.join('?'), values }); return []; };
  const load = loader({ 'next/server': responses, '@/lib/auth/profile': { getCurrentProfile: async () => learner },
    '@/lib/db': { getDb: () => sql } }, { CCJ_FEATURE_LEARNER_DATA_EXPORT: 'true' });
  const response = await load('app/api/account/export/route.ts').GET(new Request(`https://synthetic.test/api/account/export?learnerId=${foreignLearner}&organizationId=foreign`));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).profile.id, learner.id);
  assert.equal(queries.length, 12);
  for (const query of queries.filter(query=>!query.text.includes('to_regclass'))) { assert.deepEqual(query.values, [learner.id]); }
  assert.ok(queries.some(query => query.text.includes("tf.visibility='student'")));
  assert.match(response.headers.get('Content-Disposition'), /attachment/);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
});

test('export default-off switch prevents database access', async () => {
  const load = loader({ 'next/server': responses, '@/lib/auth/profile': { getCurrentProfile: async () => learner },
    '@/lib/db': { getDb() { throw Error('Unexpected database access'); } } });
  assert.equal((await load('app/api/account/export/route.ts').GET()).status, 503);
});

test('deletion review cannot target a supplied foreign learner and performs no DELETE', async () => {
  const queries = [];
  const sql = async (parts, ...values) => { queries.push({ text: parts.join('?'), values }); return []; };
  const load = loader({ 'next/cache': { revalidatePath() {} }, '@/lib/auth/profile': { getCurrentProfile: async () => learner },
    '@/lib/db': { getDb: () => sql } }, { CCJ_FEATURE_DELETION_REVIEW: 'true' });
  await load('app/workspace/student/data/actions.ts').requestDeletionReview({ learnerId: foreignLearner });
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.ok(query.values.includes(learner.id));
    assert.ok(!query.values.includes(foreignLearner));
    assert.doesNotMatch(query.text, /delete\s+from/i);
  }
  assert.match(queries[2].text, /deletion_review/);
});

test('deletion review default-off switch prevents all SQL', async () => {
  const load = loader({ 'next/cache': { revalidatePath() {} }, '@/lib/auth/profile': { getCurrentProfile: async () => learner },
    '@/lib/db': { getDb() { throw Error('Unexpected database access'); } } });
  await assert.rejects(load('app/workspace/student/data/actions.ts').requestDeletionReview(), /currently disabled/);
});

for (const role of ['student', 'teacher', 'partner_admin']) {
  test(`${role} cannot enter platform-admin role boundary`, async () => {
    const auth = loader({ '@/lib/auth/profile': { getCurrentProfile: async () => ({ ...learner, account_type: role }) },
      '@/lib/db': { getDb() { throw Error('Unexpected database access'); } } })('lib/auth/authorization.ts');
    await assert.rejects(auth.requireActiveProfile(['platform_admin']), error => error.code === 'role_not_authorized' && error.status === 403);
  });
}

test('STEAM reflection rejects a class membership that has been revoked before any write', async () => {
  const queries = [];
  const sql = async (parts, ...values) => {
    const text = parts.join('?'); queries.push(text);
    if (text.includes('from steam_mission_runs r')) return [{ id: foreignLearner, organization_id: foreignLearner, class_id: foreignLearner, attempt_count: 1 }];
    if (text.includes('from class_memberships cm')) return [];
    throw Error('Unexpected query after revoked membership');
  };
  const load = loader({ 'next/server': responses, '@/lib/auth/profile': { getCurrentProfile: async () => learner },
    '@/lib/db': { getDb: () => sql } });
  const response = await load('app/api/steam/bridge-attempt/route.ts').PUT(new Request('https://synthetic.test/api/steam/bridge-attempt', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ageBand: '10-13', runId: foreignLearner, reflection: 'Synthetic reflection', explanation: 'Synthetic explanation' }),
  }));
  assert.equal(response.status, 404);
  assert.equal(queries.length, 2);
  for (const text of queries) assert.doesNotMatch(text, /update\s+steam_mission_runs/i);
});
