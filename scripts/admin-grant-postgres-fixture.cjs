// Capture the actual grant query and exercise it on the rehearsal database.
// This tests SQL atomicity, not provider verification or a real login.
const { loader } = require('./real-module-test-loader.cjs');
const id = '71000000-0000-4000-8000-000000000001';
const org = '71000000-0000-4000-8000-000000000002';
const subject = 'synthetic-admin-grant-owner';
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
async function fixture() {
  let query;
  const profile = { id, account_type: 'partner_admin', status: 'active' };
  const sql = async (parts, ...values) => {
    query = parts.reduce((out, part, index) => out + part + (index < values.length ? literal(values[index]) : ''), '');
    return [{ ...profile, account_type: 'platform_admin' }];
  };
  const api = loader({ '@/lib/db': { getDb: () => sql }, '@/lib/auth/profile': {
    getSessionUser: async () => ({ id: subject, email: 'synthetic@example.invalid', emailVerified: true }),
    getCurrentProfile: async () => profile, ensureStudentProfile: async () => null,
  } }, { PLATFORM_ADMIN_EMAILS: 'synthetic@example.invalid' })('lib/auth/platform-admin.ts');
  await api.requirePlatformAdmin();
  if (!query?.includes('insert into admin_audit_events')) throw Error('Grant query was not captured');
  const sqlBlock = `DO $grant_fixture$
DECLARE result record; passed integer:=0;
BEGIN
 IF EXISTS(SELECT 1 FROM profiles WHERE id='${id}') OR EXISTS(SELECT 1 FROM organizations WHERE id='${org}') THEN RAISE EXCEPTION 'fixture_collision'; END IF;
 BEGIN
  INSERT INTO profiles(id,semantic_id,auth_subject,account_type,status) VALUES('${id}','synthetic-grant-profile','${subject}','partner_admin','active');
  INSERT INTO organizations(id,semantic_id,name,organization_type) VALUES('${org}','synthetic-grant-org','Synthetic grant fixture','internal');
  INSERT INTO organization_memberships(organization_id,profile_id,role,status) VALUES('${org}','${id}','partner_admin','active');
  FOR result IN ${query.replaceAll(literal(subject), literal('wrong-subject'))} LOOP RAISE EXCEPTION 'wrong_subject_granted'; END LOOP;
  IF (SELECT account_type FROM profiles WHERE id='${id}')<>'partner_admin' THEN RAISE EXCEPTION 'wrong_subject_mutated'; END IF;
  passed:=passed+1;
  FOR result IN ${query} LOOP NULL; END LOOP;
  IF (SELECT account_type FROM profiles WHERE id='${id}')<>'platform_admin'
    OR (SELECT count(*) FROM admin_audit_events WHERE target_id='${id}' AND event_type='platform_admin_granted')<>1 THEN RAISE EXCEPTION 'grant_or_audit_missing'; END IF;
  passed:=passed+1;
  FOR result IN ${query} LOOP RAISE EXCEPTION 'duplicate_grant_returned'; END LOOP;
  IF (SELECT count(*) FROM admin_audit_events WHERE target_id='${id}')<>1 THEN RAISE EXCEPTION 'duplicate_audit'; END IF;
  passed:=passed+1;
  IF NOT EXISTS(SELECT 1 FROM organization_memberships WHERE organization_id='${org}' AND profile_id='${id}' AND role='partner_admin' AND status='active') THEN RAISE EXCEPTION 'partner_membership_lost'; END IF;
  passed:=passed+1;
  -- Force the audit INSERT to fail inside the same statement. Its preceding
  -- profile UPDATE must roll back too.
  UPDATE profiles SET account_type='partner_admin' WHERE id='${id}';
  BEGIN
   FOR result IN ${query.replace("'platform_admin_granted'", 'NULL')} LOOP NULL; END LOOP;
   RAISE EXCEPTION 'audit_failure_not_detected';
  EXCEPTION WHEN not_null_violation THEN NULL;
  END;
  IF (SELECT account_type FROM profiles WHERE id='${id}')<>'partner_admin' THEN RAISE EXCEPTION 'unaudited_grant_persisted'; END IF;
  passed:=passed+1;
  RAISE EXCEPTION 'ROLLBACK_ADMIN_GRANT_FIXTURE';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'ROLLBACK_ADMIN_GRANT_FIXTURE' THEN RAISE; END IF;
 END;
 IF passed<>5 THEN RAISE EXCEPTION 'assertion_count_wrong'; END IF;
 PERFORM set_config('ccj.admin_grant_fixture_count',passed::text,true);
END $grant_fixture$;`;
  return { assertions: 5, sql_statements: [sqlBlock,
    `SELECT current_setting('ccj.admin_grant_fixture_count')::int AS assertions_passed,
    (SELECT count(*) FROM profiles WHERE id='${id}') AS remaining_profiles,
    (SELECT count(*) FROM organizations WHERE id='${org}') AS remaining_organizations,
    (SELECT count(*) FROM admin_audit_events WHERE target_id='${id}') AS remaining_audit_events`] };
}
module.exports = { fixture };
if (require.main === module) fixture().then(result => process.stdout.write(JSON.stringify(result))).catch(error => { console.error(error); process.exitCode=1; });
