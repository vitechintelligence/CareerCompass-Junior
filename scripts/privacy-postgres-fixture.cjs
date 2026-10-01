// Generate a rollback-only PostgreSQL exercise using queries captured from the
// real modules. Execute ONLY on an approved non-production branch with 016.
const fs=require('node:fs');
const path=require('node:path');
const {loader}=require('./real-module-test-loader.cjs');
const root=path.resolve(__dirname,'..');
const L='10000000-0000-4000-8000-000000000001',R='10000000-0000-4000-8000-000000000002',A='10000000-0000-4000-8000-000000000003',P='10000000-0000-4000-8000-000000000004';
const O='20000000-0000-4000-8000-000000000001',F='20000000-0000-4000-8000-000000000002',T='30000000-0000-4000-8000-000000000001',C='50000000-0000-4000-8000-000000000001';
const env={CCJ_CHILD_DATA_GOVERNANCE_APPROVED:'true'};
function literal(v){if(v===null)return 'NULL';if(typeof v==='boolean')return String(v);if(typeof v==='number'&&Number.isFinite(v))return String(v);if(typeof v==='string')return "'"+v.replaceAll("'","''")+"'";throw Error('Unsupported fixture parameter');}
function capture(profileId=L){
  const queries=[];const sql=async(parts,...values)=>{
    const text=parts.reduce((result,part,i)=>result+part+(i<values.length?literal(values[i]):''),'');queries.push(text);
    return parts.join('').includes('to_regclass')?[{ready:true}]:[{id:T}];
  };sql.transaction=cb=>Promise.all(cb(sql));
  return {queries,load:loader({'server-only':{},'next/cache':{revalidatePath(){}},'@/lib/db':{getDb:()=>sql},
    '@/lib/auth/profile':{getCurrentProfile:async()=>({id:profileId,account_type:'student',status:'active'})}},env)};
}
function form(decision='agree',purpose='guardian_reporting'){
  const result=new FormData();for(const[k,v]of Object.entries({organizationId:O,learnerId:L,authorityId:T,purpose,policyVersion:'VN-2026-10-01-v1',decision,agree:'on'}))result.set(k,v);return result;
}
async function main(){
  const allowed=capture();await allowed.load('lib/privacy/access.ts').optionalProcessingAllowed(O,L,'guardian_reporting',R);
  const select=allowed.queries.find(q=>q.includes('from optional_processing_consents'));
  const learner=capture();await learner.load('app/workspace/privacy/actions.ts').recordOptionalConsent(form());
  const representative=capture(R);await representative.load('app/workspace/privacy/actions.ts').recordOptionalConsent(form());
  const withdrawn=capture();await withdrawn.load('app/workspace/privacy/actions.ts').recordOptionalConsent(form('withdraw'));
  const pilot=capture();await pilot.load('lib/privacy/access.ts').requireAdultSyntheticPilot(L,O,'professorViAiStudy',C);
  const pilotSelect=pilot.queries.find(q=>q.includes('from adult_synthetic_pilot_accounts'));
  const upsert=q=>q.queries.find(s=>s.includes('insert into optional_processing_consents'));
  const changes=q=>q.queries.filter(s=>/^\s*(insert|update)/i.test(s)).join(';\n')+';';
  const cases=[];let count=0;
  const check=(condition,label)=>{cases.push(`IF NOT (${condition}) THEN RAISE EXCEPTION '${label}'; END IF; passed:=passed+1;`);count++;};
  const rejects=(sql,label)=>{cases.push(`BEGIN ${sql}; RAISE EXCEPTION '${label}'; EXCEPTION WHEN check_violation OR foreign_key_violation THEN NULL; END; passed:=passed+1;`);count++;};
  cases.push(upsert(learner)+';');check(`NOT EXISTS(${select})`,'one_family_party_must_not_authorize');
  cases.push(upsert(representative)+';');check(`EXISTS(${select})`,'both_current_parties_must_authorize');
  check(`NOT EXISTS(${select.replaceAll(literal(O),literal(F))})`,'foreign_tenant_must_not_authorize');
  check(`NOT EXISTS(${select.replaceAll(literal(R),literal(P))})`,'different_representative_must_not_authorize');
  cases.push(changes(withdrawn));check(`NOT EXISTS(${select})`,'withdrawal_must_stop_access');
  cases.push(upsert(representative)+';');check(`NOT EXISTS(${select})`,'resigning_one_party_must_not_reuse_withdrawn_other_party');
  cases.push(upsert(learner)+';');check(`EXISTS(${select})`,'renewed_pair_must_authorize');
  for(const [table,where,column,bad,good,label]of [
    ['learner_representative_authorities',`id=${literal(T)}`,'status','revoked','active','revoked_authority'],
    ['profiles',`id=${literal(R)}`,'status','suspended','active','inactive_representative'],
    ['profiles',`id=${literal(L)}`,'status','suspended','active','inactive_learner'],
    ['organization_memberships',`organization_id=${literal(O)} and profile_id=${literal(L)}`,'status','inactive','active','inactive_membership'],
    ['organizations',`id=${literal(O)}`,'status','paused','active','inactive_tenant'],
    ['school_processing_agreements',`organization_id=${literal(O)}`,'status','suspended','approved','suspended_agreement'],
    ['school_processing_agreements',`organization_id=${literal(O)}`,'policy_version','stale','VN-2026-10-01-v1','stale_agreement'],
    ['optional_processing_consents',`organization_id=${literal(O)} and learner_id=${literal(L)}`,'policy_version','stale','VN-2026-10-01-v1','stale_consent'],
    ['profiles',`id=${literal(A)}`,'status','suspended','active','inactive_reviewer'],
  ]){cases.push(`UPDATE ${table} SET ${column}=${literal(bad)} WHERE ${where};`);check(`NOT EXISTS(${select})`,label+'_must_deny');cases.push(`UPDATE ${table} SET ${column}=${literal(good)} WHERE ${where};`);}
  check(`EXISTS(${select})`,'restored_controls_authorize');
  rejects(`UPDATE school_processing_agreements SET reviewed_by=requested_by WHERE organization_id=${literal(O)}`,'self_review_constraint_missing');
  rejects(`UPDATE school_processing_agreements SET deployment_mode='capsule_private' WHERE organization_id=${literal(O)}`,'unsupported_deployment_approval_constraint_missing');
  rejects(`UPDATE learner_representative_authorities SET representative_profile_id=learner_id WHERE id=${literal(T)}`,'self_representative_constraint_missing');
  rejects(`UPDATE optional_processing_consents SET organization_id=${literal(F)} WHERE learner_id=${literal(L)}`,'cross_tenant_authority_fk_missing');
  rejects(`INSERT INTO privacy_rights_requests(organization_id,learner_id,requested_by,request_type,status) VALUES(${literal(O)},${literal(L)},${literal(L)},'deletion','completed')`,'terminal_evidence_constraint_missing');
  cases.push(`INSERT INTO privacy_rights_requests(organization_id,learner_id,requested_by,request_type,status,execution_reference) VALUES(${literal(O)},${literal(L)},${literal(L)},'deletion','completed','synthetic-execution-only');`);
  check(`EXISTS(SELECT 1 FROM privacy_rights_requests WHERE organization_id=${literal(O)} AND learner_id=${literal(L)} AND status='completed')`,'terminal_execution_reference_not_persisted');
  check(`EXISTS(${pilotSelect})`,'controlled_class_pilot_not_available');
  cases.push(`UPDATE feature_pilot_scopes SET expires_at=now()-interval '1 minute' WHERE organization_id=${literal(O)};`);check(`NOT EXISTS(${pilotSelect})`,'expired_pilot_must_deny');
  cases.push(`UPDATE feature_pilot_scopes SET expires_at=now()+interval '1 hour',enabled=false WHERE organization_id=${literal(O)};`);check(`NOT EXISTS(${pilotSelect})`,'disabled_pilot_must_deny');
  cases.push(`UPDATE feature_pilot_scopes SET enabled=true WHERE organization_id=${literal(O)};`);
  check(`NOT EXISTS(${pilotSelect.replaceAll(literal(O),literal(F))})`,'foreign_class_pilot_must_deny');
  cases.push(`UPDATE adult_synthetic_pilot_accounts SET expires_at=now()-interval '1 minute' WHERE profile_id=${literal(L)};`);check(`NOT EXISTS(${pilotSelect})`,'expired_adult_attestation_must_deny');
  const sql=`-- Generated from real consent/access modules by scripts/privacy-postgres-fixture.cjs.
-- Non-production only. The inner subtransaction is deliberately rolled back.
DO $fixture$
DECLARE passed integer:=0;
BEGIN
  IF EXISTS(SELECT 1 FROM profiles WHERE id IN (${[L,R,A,P].map(literal).join(',')})) OR EXISTS(SELECT 1 FROM organizations WHERE id IN (${[O,F].map(literal).join(',')})) THEN RAISE EXCEPTION 'fixture_identifier_collision'; END IF;
  BEGIN
    INSERT INTO profiles(id,semantic_id,account_type,status) VALUES
      (${literal(L)},'phase-a-synthetic-learner','student','active'),(${literal(R)},'phase-a-synthetic-adult-representative','student','active'),
      (${literal(A)},'phase-a-synthetic-reviewer','platform_admin','active'),(${literal(P)},'phase-a-synthetic-school-admin','partner_admin','active');
    INSERT INTO organizations(id,semantic_id,name,organization_type,status) VALUES(${literal(O)},'phase-a-synthetic-org','Synthetic internal fixture','internal','active'),(${literal(F)},'phase-a-synthetic-foreign-org','Synthetic foreign fixture','internal','active');
    INSERT INTO organization_memberships(organization_id,profile_id,role,status) VALUES(${literal(O)},${literal(L)},'student','active');
    INSERT INTO classes(id,organization_id,semantic_id,name,status) VALUES(${literal(C)},${literal(O)},'phase-a-synthetic-class','Synthetic pilot class','active');
    INSERT INTO class_memberships(class_id,student_id,status) VALUES(${literal(C)},${literal(L)},'active');
    INSERT INTO school_processing_agreements(organization_id,policy_version,status,deployment_mode,school_legal_name,school_contact,vitech_contact,processing_countries,approved_providers,retention_schedule,agreement_reference,privacy_review_reference,requested_by,reviewed_by,reviewed_at)
      VALUES(${literal(O)},'VN-2026-10-01-v1','approved','vitech_managed_cloud','Synthetic school','synthetic school contact','synthetic provider contact','synthetic countries','synthetic providers','synthetic retention','synthetic agreement','synthetic review',${literal(P)},${literal(A)},now());
    INSERT INTO learner_representative_authorities(id,organization_id,learner_id,representative_profile_id,evidence_reference,verified_by,status) VALUES(${literal(T)},${literal(O)},${literal(L)},${literal(R)},'synthetic verified authority',${literal(P)},'active');
    INSERT INTO adult_synthetic_pilot_accounts(profile_id,verified_by,evidence_reference,expires_at) VALUES(${literal(L)},${literal(A)},'synthetic adult attestation',now()+interval '1 hour');
    INSERT INTO feature_pilot_scopes(organization_id,class_id,feature_key,enabled,approved_by,expires_at) VALUES(${literal(O)},${literal(C)},'professorViAiStudy',true,${literal(A)},now()+interval '1 hour');
    ${cases.join('\n    ')}
    RAISE EXCEPTION 'ROLLBACK_SYNTHETIC_FIXTURE';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'ROLLBACK_SYNTHETIC_FIXTURE' THEN RAISE; END IF;
  END;
  IF passed<>${count} THEN RAISE EXCEPTION 'fixture_assertion_count_wrong'; END IF;
  PERFORM set_config('ccj.privacy_fixture_count',passed::text,true);
END $fixture$;`;
  const final=`SELECT current_setting('ccj.privacy_fixture_count')::int AS assertions_passed,(SELECT count(*) FROM profiles WHERE id IN (${[L,R,A,P].map(literal).join(',')})) AS remaining_synthetic_profiles,(SELECT count(*) FROM organizations WHERE id IN (${[O,F].map(literal).join(',')})) AS remaining_synthetic_organizations;`;
  const output=path.join(root,'.privacy-test/privacy-governance-postgres-fixture.sql');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,sql+'\n'+final+'\n');
  process.stdout.write(JSON.stringify({assertions:count,path:output,sql_statements:[sql,final]}));
}
main().catch(error=>{process.stderr.write(error.stack);process.exitCode=1;});
