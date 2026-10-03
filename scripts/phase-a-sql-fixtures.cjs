// Generate read-only CTE fixtures from the actual guardian/teacher/partner SQL.
// The emitted SELECTs shadow table names; no application rows are read or changed.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function source(file) {
  return process.env.PHASE_A_SOURCE_REF
    ? execFileSync('git', ['show', `${process.env.PHASE_A_SOURCE_REF}:${file}`], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8');
}
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const guardianSource = source('app/workspace/guardian/report/[learnerId]/page.tsx');
const linkSql = guardianSource.match(/const links=await sql`([\s\S]*?)`;/)[1];
const evidenceSql = guardianSource.match(/sql`(\s*select title_en,[\s\S]*?)`/)[1];
const cases = [];
const active = { guardian: id(3), learner: id(1), organization: id(10), link: 'active', consent: 'active', member: 'active', learnerStatus: 'active' };
for (const [name, changes, expected] of [
  ['guardian-own-linked-learner', {}, 1],
  ['guardian-foreign-learner', { learner: id(2) }, 0],
  ['guardian-foreign-tenant', { organization: id(20) }, 0],
  ['learner-cannot-use-guardian-link', { guardian: id(1) }, 0],
  ['teacher-cannot-use-guardian-link', { guardian: id(4) }, 0],
  ['platform-admin-cannot-use-guardian-link', { guardian: id(5) }, 0],
  ['revoked-guardian-link', { link: 'revoked' }, 0],
  ['revoked-guardian-consent', { consent: 'revoked' }, 0],
  ['withdrawn-institution-membership', { member: 'inactive' }, 0],
  ['suspended-learner', { learnerStatus: 'suspended' }, 0],
]) {
  const v = { ...active, ...changes };
  const fixture = `WITH
    profiles(id,semantic_id,display_name,status,account_type) AS (VALUES (${q(id(1))}::uuid,'fixture-a','Fixture A',${q(v.learnerStatus)},'student')),
    organizations(id,name,status) AS (VALUES (${q(id(10))}::uuid,'Fixture Org','active')),
    organization_memberships(organization_id,profile_id,role,status) AS (VALUES (${q(id(10))}::uuid,${q(id(1))}::uuid,'student',${q(v.member)})),
    guardian_report_links(learner_id,organization_id,guardian_profile_id,status) AS (VALUES (${q(id(1))}::uuid,${q(id(10))}::uuid,${q(id(3))}::uuid,${q(v.link)})),
    learner_consent_records(learner_id,organization_id,consent_type,status,guardian_confirmation,revoked_at) AS (VALUES (${q(id(1))}::uuid,${q(id(10))}::uuid,'guardian_reporting',${q(v.consent)},true,null::timestamptz))`;
  const select = linkSql.replaceAll('${profile.id}', q(v.guardian)).replaceAll('${learnerId}', q(v.learner)).replaceAll('${organizationId}', q(v.organization));
  cases.push({ name, expected, sql: `${fixture} SELECT ${q(name)} AS test, count(*)::int AS actual FROM (${select}) result;` });
}
const fixture = `WITH learning_capsules(learner_id,organization_id,title_en,title_vi,mastery_level,status,sharing_scope,achieved_on,created_at) AS (VALUES
  (${q(id(1))}::uuid,${q(id(10))}::uuid,'private-verified','x','verified','verified','private',current_date,now()),
  (${q(id(1))}::uuid,${q(id(10))}::uuid,'draft','x','practiced','draft','shareable',current_date,now()),
  (${q(id(1))}::uuid,${q(id(10))}::uuid,'learner-only','x','verified','verified','learner',current_date,now()),
  (${q(id(1))}::uuid,${q(id(10))}::uuid,'shareable-verified','x','verified','verified','shareable',current_date,now()),
  (${q(id(2))}::uuid,${q(id(10))}::uuid,'foreign-learner','x','verified','verified','shareable',current_date,now()),
  (${q(id(1))}::uuid,${q(id(20))}::uuid,'foreign-tenant','x','verified','verified','shareable',current_date,now()))`;
const select = evidenceSql.replaceAll('${learnerId}', q(id(1))).replaceAll('${organizationId}', q(id(10)));
cases.push({ name: 'guardian-shareable-reviewed-evidence-only', expected: 1,
  sql: `${fixture} SELECT 'guardian-shareable-reviewed-evidence-only' AS test, count(*)::int AS actual, array_agg(title_en ORDER BY title_en) AS titles FROM (${select}) result;` });

const authSource = source('lib/auth/authorization.ts');
for (const [helper, actor, other, expectedRole] of [
  ['requireTeacherClassAccess', id(4), id(6), 'teacher'],
  ['requirePartnerOrganizationAccess', id(7), id(8), 'partner_admin'],
]) {
  const block = authSource.split(`export async function ${helper}(`)[1].split('\nexport ')[0];
  const sqlTemplates = [...block.matchAll(/sql`([\s\S]*?)`/g)].map(match => match[1]);
  const template = sqlTemplates[sqlTemplates.length - 1];
  for (const [label, requested, memberStatus, expected] of [
    ['own', id(10), 'active', 1], ['foreign', id(20), 'active', 0], ['inactive', id(10), 'inactive', 0],
  ]) {
    const name = `${expectedRole}-${label}-scope`;
    const fixture = `WITH
      organizations(id,status) AS (VALUES (${q(id(10))}::uuid,'active'),(${q(id(20))}::uuid,'active')),
      classes(id,organization_id,status) AS (VALUES (${q(id(10))}::uuid,${q(id(10))}::uuid,'active'),(${q(id(20))}::uuid,${q(id(20))}::uuid,'active')),
      teacher_assignments(class_id,teacher_id) AS (VALUES (${q(id(10))}::uuid,${q(actor)}::uuid),(${q(id(20))}::uuid,${q(other)}::uuid)),
      organization_memberships(organization_id,profile_id,role,status) AS (VALUES (${q(id(10))}::uuid,${q(actor)}::uuid,${q(expectedRole)},${q(memberStatus)}),(${q(id(20))}::uuid,${q(other)}::uuid,${q(expectedRole)},'active'))`;
    const select = template.replaceAll('${classId}', q(requested)).replaceAll('${organizationId}', q(requested)).replaceAll('${profile.id}', q(actor));
    cases.push({ name, expected, sql: `${fixture} SELECT ${q(name)} AS test, count(*)::int AS actual FROM (${select}) result;` });
  }
}
const steamSource = source('app/api/steam/bridge-attempt/route.ts').split('export async function PUT')[1];
const steamQuery = steamSource.match(/const rows = await sql`([\s\S]*?)`;/)[1];
for (const [label, requester, member, orgStatus, expected] of [
  ['own', id(1), 'active', 'active', 1], ['foreign-learner', id(2), 'active', 'active', 0],
  ['withdrawn', id(1), 'inactive', 'active', 0], ['inactive-tenant', id(1), 'active', 'suspended', 0],
]) {
  const name = `steam-reflection-${label}`;
  const fixture = `WITH
    steam_mission_runs(id,learner_id,organization_id,class_id,mission_id,age_band,status,attempt_count) AS (VALUES (${q(id(100))}::uuid,${q(id(1))}::uuid,${q(id(10))}::uuid,null::uuid,${q(id(101))}::uuid,'10-13','in_progress',1)),
    steam_missions(id,mission_key) AS (VALUES (${q(id(101))}::uuid,'fixture-mission')),
    organizations(id,status) AS (VALUES (${q(id(10))}::uuid,${q(orgStatus)})),
    organization_memberships(organization_id,profile_id,role,status) AS (VALUES (${q(id(10))}::uuid,${q(id(1))}::uuid,'student',${q(member)}))`;
  const select = steamQuery.replaceAll('${runId}', q(id(100))).replaceAll('${profile.id}', q(requester))
    .replaceAll('${ageBand}', q('10-13')).replaceAll('${missionDefinition.key}', q('fixture-mission'));
  cases.push({ name, expected, sql: `${fixture} SELECT ${q(name)} AS test, count(*)::int AS actual FROM (${select}) result;` });
}
process.stdout.write(JSON.stringify(cases, null, 2));
