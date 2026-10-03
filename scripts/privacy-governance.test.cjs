const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loader } = require('./real-module-test-loader.cjs');
const learnerId='10000000-0000-4000-8000-000000000001';
const representativeId='10000000-0000-4000-8000-000000000002';
const staffId='10000000-0000-4000-8000-000000000003';
const org='20000000-0000-4000-8000-000000000001';
const foreignOrg='20000000-0000-4000-8000-000000000002';
const authority='30000000-0000-4000-8000-000000000001';
const sourceId='40000000-0000-4000-8000-000000000001';
const learner={id:learnerId,semantic_id:'synthetic-learner',account_type:'student',status:'active'};
const policyVersion='VN-2026-10-01-v1';
const next={NextResponse:class extends Response {static json(body,init){return new Response(JSON.stringify(body),init);}}};
function database(answer=()=>[]) {
  const records=[];
  const sql=async(parts,...values)=>{
    const query={text:parts.join('?'),values};records.push(query);
    if(query.text.includes('to_regclass'))return [{ready:true}];
    return answer(query);
  };
  sql.transaction=async callback=>Promise.all(callback(sql));
  return {sql,records};
}
function mocks(profile,db) {return {'server-only':{},'next/server':next,'next/cache':{revalidatePath(){}},
  '@/lib/auth/profile':{getCurrentProfile:async()=>profile},'@/lib/db':{getDb:()=>db.sql}};}
function form(values={}) {
  const result=new FormData();
  for(const [key,value] of Object.entries({organizationId:org,learnerId,purpose:'guardian_reporting',authorityId:authority,policyVersion,decision:'agree',agree:'on',...values}))result.set(key,value);
  return result;
}
function writes(db){return db.records.filter(q=>/\b(insert|update|delete)\s/i.test(q.text));}
const production={VERCEL_ENV:'production',NODE_ENV:'production',CCJ_INTELLIGENCE_RUNTIME_MODE:'legacy_synthetic_sandbox',
  CCJ_PROFESSOR_VI_LIVE_ENABLED:'true',CCJ_REPORT_CARD_AI_BUILDER_LIVE_ENABLED:'true',OPENAI_API_KEY:'synthetic-never-send'};

for(const mode of ['disabled','governed_halibut','legacy_synthetic_sandbox','unexpected'])test(`production blocks learner intelligence mode ${mode}`,async()=>{
  let calls=0;const load=loader({'server-only':{}},{...production,CCJ_INTELLIGENCE_RUNTIME_MODE:mode},{fetch(){calls++;throw Error('Unexpected egress');}});
  assert.equal(load('lib/exchange/runtime-policy.ts').intelligenceRuntimeAvailability().available,false);
  await assert.rejects(load('lib/professor-vi/runtime.ts').runProfessorVi({}),/disabled|not_connected/);
  assert.equal(calls,0);
});
test('sandbox requires an explicit recognized non-production environment',()=>{
  for(const env of [{},{NODE_ENV:'unknown'},{VERCEL_ENV:'unexpected',NODE_ENV:'production'}]){
    assert.equal(loader({}, {...env,CCJ_INTELLIGENCE_RUNTIME_MODE:'legacy_synthetic_sandbox'})('lib/exchange/runtime-policy.ts').intelligenceRuntimeAvailability().available,false);
  }
  assert.equal(loader({}, {VERCEL_ENV:'preview',NODE_ENV:'production',CCJ_INTELLIGENCE_RUNTIME_MODE:'legacy_synthetic_sandbox'})('lib/exchange/runtime-policy.ts').intelligenceRuntimeAvailability().available,true);
});
test('production public-contact lookup has no provider egress',async()=>{
  let calls=0;const api=loader({'server-only':{}},production,{fetch(){calls++;}})('lib/vst-junior-ai.ts');
  const result=await api.findPublicCompanyContact('Synthetic business',undefined,{mode:'openai',allowWebSearch:true});
  assert.equal(result.provider,'mock');assert.equal(calls,0);
});
test('new profile onboarding requires both gates; verified admin provisioning remains available',()=>{
  const policy=loader({}, {})('lib/auth/admin-identity-policy.ts');
  assert.equal(policy.newProfileProvisioningAllowed({email:'labellesolutionservices@gmail.com',emailVerified:false}),false);
  assert.equal(policy.newProfileProvisioningAllowed({email:'labellesolutionservices@gmail.com',emailVerified:true}),true);
  assert.equal(policy.newProfileProvisioningAllowed({email:'unlisted@example.invalid',emailVerified:true}),false);
  assert.equal(loader({}, {CCJ_REAL_LEARNER_ONBOARDING_ENABLED:'true'})('lib/privacy/policy.ts').learnerOnboardingApproved(),false);
  assert.equal(loader({}, {CCJ_REAL_LEARNER_ONBOARDING_ENABLED:'true',CCJ_CHILD_DATA_GOVERNANCE_APPROVED:'true'})('lib/privacy/policy.ts').learnerOnboardingApproved(),true);
});
test('closing signup preserves delegation of existing sign-in',async()=>{
  let calls=0;const route=loader({'@/lib/auth/server':{getAuth(){calls++;return {handler:()=>({POST:async()=>new Response('ok')})};}}})('app/api/auth/[...path]/route.ts');
  assert.equal((await route.POST(new Request('https://synthetic.test'),{params:Promise.resolve({path:['sign-up','email']})})).status,403);assert.equal(calls,0);
  assert.equal((await route.POST(new Request('https://synthetic.test'),{params:Promise.resolve({path:['sign-in','email']})})).status,200);assert.equal(calls,1);
});
test('unverified existing admin profile survives closed new-account provisioning',async()=>{
  const profile={...learner,id:staffId,account_type:'platform_admin'};
  const db=database(()=>[profile]);
  const api=loader({'@/lib/db':{getDb:()=>db.sql},'@/lib/auth/server':{getAuth:()=>({getSession:async()=>({data:{user:{id:'existing-admin',email:'labellesolutionservices@gmail.com',emailVerified:false}}})})}})('lib/auth/platform-admin.ts');
  assert.equal((await api.requirePlatformAdmin()).profile.id,staffId);assert.equal(writes(db).length,0);
});
test('verified-admin tightening is enforced at the shared profile boundary',async()=>{
  const db=database(()=>[{...learner,id:staffId,account_type:'platform_admin'}]);
  const api=loader({'@/lib/db':{getDb:()=>db.sql},'@/lib/auth/server':{getAuth:()=>({getSession:async()=>({data:{user:{id:'existing-admin',emailVerified:false}}})})}},
    {CCJ_REQUIRE_VERIFIED_PLATFORM_ADMIN:'true'})('lib/auth/profile.ts');
  assert.equal(await api.getCurrentProfile(),null);assert.equal(writes(db).length,0);
});
test('neither nominated unverified email can receive a new admin grant',async()=>{
  for(const email of ['labellesolutionservices@gmail.com','vichung196@gmail.com']){
    const db=database();
    const api=loader({'@/lib/db':{getDb:()=>db.sql},'@/lib/auth/profile':{
      getSessionUser:async()=>({id:'synthetic-owner',email,emailVerified:false}),
      getCurrentProfile:async()=>({...learner,account_type:'partner_admin'}),ensureStudentProfile:async()=>null,
    }},{PLATFORM_ADMIN_EMAILS:'labellesolutionservices@gmail.com,vichung196@gmail.com'})('lib/auth/platform-admin.ts');
    assert.equal(await api.getPlatformAdminContext(),null);assert.equal(db.records.length,0);
  }
});
test('verified nominated partner grant binds the identity and audit in one SQL statement',async()=>{
  const promoted={...learner,account_type:'platform_admin'};
  const db=database(()=>[promoted]);
  const api=loader({'@/lib/db':{getDb:()=>db.sql},'@/lib/auth/profile':{
    getSessionUser:async()=>({id:'synthetic-owner',email:'vichung196@gmail.com',emailVerified:true}),
    getCurrentProfile:async()=>({...learner,account_type:'partner_admin'}),ensureStudentProfile:async()=>null,
  }},{PLATFORM_ADMIN_EMAILS:'vichung196@gmail.com'})('lib/auth/platform-admin.ts');
  assert.equal((await api.requirePlatformAdmin()).profile.account_type,'platform_admin');
  assert.equal(db.records.length,1);assert.match(db.records[0].text,/for update/);
  assert.match(db.records[0].text,/insert into admin_audit_events/);
  assert.match(db.records[0].text,/auth_subject = \?/);assert.ok(db.records[0].values.includes('synthetic-owner'));
  assert.doesNotMatch(db.records[0].text,/update organization_memberships/);
});
test('admin grant does not return successful access when the atomic audit query fails',async()=>{
  const db=database(()=>{throw Error('synthetic audit unavailable');});
  const api=loader({'@/lib/db':{getDb:()=>db.sql},'@/lib/auth/profile':{
    getSessionUser:async()=>({id:'synthetic-owner',email:'vichung196@gmail.com',emailVerified:true}),
    getCurrentProfile:async()=>({...learner,account_type:'partner_admin'}),ensureStudentProfile:async()=>null,
  }},{PLATFORM_ADMIN_EMAILS:'vichung196@gmail.com'})('lib/auth/platform-admin.ts');
  await assert.rejects(api.requirePlatformAdmin(),/synthetic audit unavailable/);assert.equal(db.records.length,1);
});
test('concurrent admin grant retry reads the committed role without creating another event',async()=>{
  let reads=0;const db=database(()=>[]);
  const api=loader({'@/lib/db':{getDb:()=>db.sql},'@/lib/auth/profile':{
    getSessionUser:async()=>({id:'synthetic-owner',email:'vichung196@gmail.com',emailVerified:true}),
    getCurrentProfile:async()=>({...learner,account_type:++reads===1?'partner_admin':'platform_admin'}),ensureStudentProfile:async()=>null,
  }},{PLATFORM_ADMIN_EMAILS:'vichung196@gmail.com'})('lib/auth/platform-admin.ts');
  assert.equal((await api.requirePlatformAdmin()).profile.account_type,'platform_admin');
  assert.equal((await api.requirePlatformAdmin()).profile.account_type,'platform_admin');assert.equal(db.records.length,1);
});
for(const actor of [null,{...learner,account_type:'teacher'}, {...learner,id:staffId,account_type:'partner_admin'}, {...learner,id:representativeId}, {...learner,status:'suspended'}]){
  test(`unlinked/inactive ${actor?.account_type||'anonymous'} cannot sign a learner consent`,async()=>{
    const db=database();const api=loader(mocks(actor,db))('app/workspace/privacy/actions.ts');
    await assert.rejects(api.recordOptionalConsent(form()),/authentication|required|inactive|not_authorized/);
    assert.equal(writes(db).length,0);
  });
}
test('missing governance schema blocks consent instead of trusting legacy booleans',async()=>{
  const db=database();db.sql.transaction=()=>{throw Error('Unexpected write');};
  const sql=async()=>[{ready:false}];const api=loader({...mocks(learner,db),'@/lib/db':{getDb:()=>sql}})('app/workspace/privacy/actions.ts');
  await assert.rejects(api.recordOptionalConsent(form()),/not_configured/);
});
test('learner and representative sign separately; withdrawal needs no feature/approval gate',async()=>{
  for(const actor of [learner,{...learner,id:representativeId}]){
    const db=database(q=>q.text.includes('select')?[{id:authority}]:[]);
    const api=loader(mocks(actor,db),{CCJ_CHILD_DATA_GOVERNANCE_APPROVED:'true'})('app/workspace/privacy/actions.ts');await api.recordOptionalConsent(form());
    const upsert=writes(db).find(q=>q.text.includes('insert into optional_processing_consents'));
    assert.ok(upsert);assert.equal(upsert.values.filter(v=>typeof v==='boolean').every(v=>v===(actor.id===learnerId)),true);
    assert.ok(upsert.text.includes('withdrawn_at is null'));assert.ok(upsert.text.includes('authority_id=excluded.authority_id'));
    assert.equal(writes(db).some(q=>q.text.includes('privacy_consent_events')),true);
  }
  const db=database(q=>q.text.includes('select')?[{id:learnerId}]:[]);
  await loader(mocks(learner,db))('app/workspace/privacy/actions.ts').recordOptionalConsent(form({decision:'withdraw',agree:'',policyVersion:'old',authorityId:''}));
  assert.ok(writes(db).some(q=>q.text.includes('optional_processing_consents')));
  assert.ok(writes(db).some(q=>q.text.includes('learner_consent_records')));
  assert.equal(db.records.some(q=>q.text.includes('from school_processing_agreements')),false);
});
for(const purpose of ['industry_network','capsule_exchange'])test(`unconnected ${purpose} consent cannot be activated`,async()=>{
  const db=database(q=>q.text.includes('select')?[{id:learnerId}]:[]);
  await assert.rejects(loader(mocks(learner,db))('app/workspace/privacy/actions.ts').recordOptionalConsent(form({purpose})),/not_connected/);
  assert.equal(writes(db).length,0);
});
test('staff legacy consent signing is blocked at the server action',async()=>{
  const db=database();await assert.rejects(loader(mocks({...learner,account_type:'partner_admin'},db))('app/workspace/partner/actions.ts').recordLearnerConsent(),/own consent/);
  assert.equal(writes(db).length,0);
});
test('optional processing query binds tenant, subject, exact guardian and current independent approvals',async()=>{
  const db=database(()=>[]);const access=loader(mocks(learner,db),{CCJ_CHILD_DATA_GOVERNANCE_APPROVED:'true'})('lib/privacy/access.ts');
  assert.equal(await access.optionalProcessingAllowed(org,learnerId,'guardian_reporting',representativeId),false);
  const query=db.records.find(q=>q.text.includes('from optional_processing_consents'));
  for(const value of [org,learnerId,representativeId,policyVersion])assert.ok(query.values.includes(value));
  for(const condition of ['learner_signed_at is not null','representative_signed_at is not null',"om.status='active'",'agreement.reviewed_by<>agreement.requested_by',"a.status='active'",'c.withdrawn_at is null'])assert.ok(query.text.includes(condition));
});
test('a withdrawing team contributor blocks old showcase material',async()=>{
  const db=database(q=>q.text.includes('select distinct contributors')?[{student_id:learnerId},{student_id:representativeId}]:[]);
  const api=loader({...mocks(learner,db),'@/lib/privacy/access':{optionalProcessingAllowed:async(o,p)=>o===org&&p===learnerId}})('lib/privacy/community.ts');
  assert.equal(await api.communityTeamSharingAllowed(org,sourceId),false);
  assert.ok(db.records[0].text.includes('union select submitted_by'));
});
test('oversized streamed JSON is cancelled even with a forged short content length',async()=>{
  let cancelled=false;
  const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(2048));},cancel(){cancelled=true;}});
  const request=new Request('https://synthetic.test',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'1'},body:stream,duplex:'half'});
  await assert.rejects(loader()('lib/learning/request-form.ts').readBoundedJson(request,1024),/too_large/);assert.equal(cancelled,true);
});
test('source deletion cannot act on a foreign learner or institution',async()=>{
  const db=database();let deleted=0;
  const route=loader({...mocks(learner,db),'@/lib/professor-vi/runtime':{deleteProfessorViSource:async()=>{deleted++;return true;}}})('app/api/ai-study/source/route.ts');
  const result=await route.DELETE(new Request('https://synthetic.test',{method:'DELETE',body:JSON.stringify({organizationId:foreignOrg,sourceId})}));
  assert.equal(result.status,404);assert.equal(deleted,0);assert.equal(writes(db).length,0);
  assert.deepEqual(db.records[0].values,[sourceId,learnerId,foreignOrg]);
});
test('cross-origin AI/source mutations are blocked before parsing or SQL',async()=>{
  const db=database();const route=loader(mocks(learner,db))('app/api/ai-study/source/route.ts');
  const response=await route.DELETE(new Request('https://synthetic.test/api/ai-study/source',{method:'DELETE',headers:{Origin:'https://foreign.test'},body:'{}'}));
  assert.equal(response.status,403);assert.equal(db.records.length,0);
});
test('owned source can be deleted with AI flags and consent disabled',async()=>{
  const db=database(q=>q.text.includes('select provider_file_id')?[{provider_file_id:'synthetic-file'}]:[]);
  let deleted=0;const route=loader({...mocks(learner,db),'@/lib/professor-vi/runtime':{deleteProfessorViSource:async()=>{deleted++;return true;}}})('app/api/ai-study/source/route.ts');
  const result=await route.DELETE(new Request('https://synthetic.test',{method:'DELETE',body:JSON.stringify({organizationId:org,sourceId})}));
  assert.equal(result.status,200);assert.equal(deleted,1);assert.deepEqual(writes(db)[0].values,[sourceId,learnerId,org]);
});
test('provider expiry/deletion 404 is success even after runtime is disabled',async()=>{
  let calls=0;const runtime=loader({'server-only':{}},{OPENAI_API_KEY:'synthetic-test'},{fetch:async()=>{calls++;return new Response('',{status:404});}})('lib/professor-vi/runtime.ts');
  assert.equal(await runtime.deleteProfessorViSource('synthetic-file'),true);assert.equal(calls,1);
});
test('deterministic report drafts work without AI; uploaded import never reports fake conversion',async()=>{
  const answers={countryCode:'VN',educationLevel:'primary',startMode:'country_template',schoolName:'Synthetic school',title:'Synthetic report',languages:['vi'],academicPeriods:['Year'],gradingScale:'10',subjects:['English'],requiredSignatures:[]};
  let calls=0;const runtime=loader({'server-only':{}},production,{fetch(){calls++;}})('lib/report-cards/ai-builder.ts');
  assert.equal((await runtime.runReportCardBuilder({answers})).generationMode,'deterministic');
  await assert.rejects(runtime.runReportCardBuilder({answers,uploadedTemplate:new File(['blank'],'blank.pdf')}),/requires_connected_runtime/);assert.equal(calls,0);
});
test('pending teacher review hides generated study content in the actual API response',async()=>{
  const db=database(q=>q.text.includes('from ai_study_sources')?[{id:sourceId,title:'Synthetic source',provider_file_id:'synthetic-file'}]:[]);
  const route=loader({...mocks(learner,db),'@/lib/professor-vi/access':{requireProfessorViStudentAccess:async()=>({profile:learner})},
    '@/lib/professor-vi/context':{loadProfessorViInstitutionPolicy:async()=>({allowedModes:['summary'],teacherReviewRequired:true}),loadProfessorViLearnerState:async()=>({})},
    '@/lib/professor-vi/runtime':{runProfessorVi:async()=>({text:'{"title":"Draft","contentMarkdown":"unreviewed secret"}',provider:'synthetic',model:'synthetic'}),safeJsonFromModel:JSON.parse}})('app/api/ai-study/generate/route.ts');
  const response=await route.POST(new Request('https://synthetic.test',{method:'POST',body:JSON.stringify({organizationId:org,sourceId,packType:'summary'})}));
  assert.equal(response.status,201);const body=await response.json();assert.equal(body.reviewStatus,'pending_review');assert.equal(Object.hasOwn(body,'contentMarkdown'),false);
  assert.ok(writes(db).some(q=>q.values.some(v=>typeof v==='string'&&v.includes('unreviewed secret'))));
});
test('synthetic source uploads use a generic filename and the same bounded provider expiry',async()=>{
  const calls=[];const runtime=loader({'server-only':{}},{...production,VERCEL_ENV:'preview'},
    {fetch:async(url,options)=>{calls.push({url,options});return Response.json({id:'synthetic-file'});}})('lib/professor-vi/runtime.ts');
  await runtime.uploadProfessorViSource(new File(['synthetic notes'],'private-name.txt'),365);
  const payload=calls[0].options.body;
  assert.equal(payload.get('file').name,'study-source.txt');
  assert.equal(payload.get('expires_after[seconds]'),String(30*86400));
  assert.ok(calls[0].options.signal);assert.equal(calls[0].options.cache,'no-store');
});
test('failed source metadata persistence attempts provider cleanup and never reports saved data',async()=>{
  const db=database(q=>{if(q.text.includes('insert into ai_study_sources'))throw Error('Synthetic persistence failure');return [];});
  let removed=0;
  const route=loader({...mocks(learner,db),'@/lib/professor-vi/access':{requireProfessorViStudentAccess:async()=>({profile:learner})},
    '@/lib/professor-vi/context':{loadProfessorViInstitutionPolicy:async()=>({enabled:true,allowSourceUploads:true,allowedSourceTypes:['txt'],maxSourceBytes:1048576,retentionDays:365})},
    '@/lib/professor-vi/runtime':{sourceHash:()=> 'synthetic-hash',uploadProfessorViSource:async()=>({id:'synthetic-file'}),deleteProfessorViSource:async()=>{removed++;return true;}}})('app/api/ai-study/source/route.ts');
  const body=new FormData();body.set('organizationId',org);body.set('sourcePermission','on');body.set('file',new File(['Synthetic notes'],'notes.txt'));
  const response=await route.POST(new Request('https://synthetic.test',{method:'POST',body}));
  assert.equal(response.status,503);assert.equal(removed,1);assert.equal((await response.json()).error,'study_source_metadata_save_failed');
  assert.ok(writes(db).find(q=>q.text.includes('insert into ai_study_sources')).values.includes(30*86400));
});
test('terminal rights status needs execution evidence; foreign requests do not return success',async()=>{
  const db=database();const api=loader({...mocks(learner,db),'@/lib/auth/authorization':{isUuidReference:v=>/^[\da-f-]{36}$/.test(v),requirePartnerOrganizationAccess:async()=>({profile:{id:staffId}})}})('app/workspace/partner/privacy-governance/actions.ts');
  await assert.rejects(api.reviewPrivacyRightsRequest(form({requestId:sourceId,status:'completed',executionReference:''})),/evidence_required/);assert.equal(writes(db).length,0);
  await assert.rejects(api.reviewPrivacyRightsRequest(form({requestId:sourceId,status:'in_review'})),/not_found/);
  assert.ok(writes(db).every(q=>q.values.includes(org)&&q.values.includes(sourceId)));
});
test('concurrent source upload cleans redundant provider file and returns the saved winning record',async()=>{
  let reads=0,removed=0;
  const db=database(q=>{if(q.text.includes('from ai_study_sources')&&q.text.includes('select')){reads++;return reads===1?[]:[{id:sourceId,title:'Saved winner'}];}return [];});
  const route=loader({...mocks(learner,db),'@/lib/professor-vi/access':{requireProfessorViStudentAccess:async()=>({profile:learner})},
    '@/lib/professor-vi/context':{loadProfessorViInstitutionPolicy:async()=>({enabled:true,allowSourceUploads:true,allowedSourceTypes:['txt'],maxSourceBytes:1048576,retentionDays:1})},
    '@/lib/professor-vi/runtime':{sourceHash:()=> 'synthetic-hash',uploadProfessorViSource:async()=>({id:'redundant-file'}),deleteProfessorViSource:async()=>{removed++;return true;}}})('app/api/ai-study/source/route.ts');
  const body=new FormData();body.set('organizationId',org);body.set('sourcePermission','on');body.set('file',new File(['Synthetic notes'],'notes.txt'));
  const response=await route.POST(new Request('https://synthetic.test',{method:'POST',body}));
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.deduplicated,true);assert.equal(result.source.id,sourceId);assert.equal(removed,1);
  assert.ok(writes(db).some(q=>q.text.includes("status='expired'")&&q.values.includes(learnerId)&&q.values.includes(org)));
});
