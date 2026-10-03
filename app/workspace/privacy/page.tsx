import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { privacySchemaReady, optionalProcessingAllowed } from "@/lib/privacy/access";
import { PRIVACY_POLICY_VERSION,OPTIONAL_PURPOSES,PURPOSE_LABELS } from "@/lib/privacy/policy";
import { recordOptionalConsent,submitPrivacyRightsRequest } from "./actions";
import DeleteStudySource from "./DeleteStudySource";
import { DataCaptureNotice } from "@/app/privacy/PrivacyNotice";
export const dynamic="force-dynamic";
export default async function Page(){
  const profile=await getCurrentProfile();
  if(!profile||profile.status!=='active')return <main className="workspacePage"><Link href="/auth/sign-in">Sign in / Đăng nhập</Link></main>;
  if(!await privacySchemaReady())return <main className="workspacePage"><div className="workspaceContent"><h1>Privacy workflow is not configured / Chưa cấu hình quy trình quyền riêng tư</h1><DataCaptureNotice/><p>Optional processing remains blocked. Contact the school or ViTech privacy owner for rights requests. / Xử lý tùy chọn vẫn bị chặn. Liên hệ đầu mối trường/ViTech để yêu cầu quyền.</p></div></main>;
  const sql=getDb();const subjects=await sql`select distinct om.organization_id,o.name,p.id as learner_id,p.semantic_id from organization_memberships om
    join organizations o on o.id=om.organization_id join profiles p on p.id=om.profile_id and p.account_type='student'
    where om.role='student' and (p.id=${profile.id} or exists(select 1 from learner_representative_authorities a
      where a.organization_id=om.organization_id and a.learner_id=p.id and a.representative_profile_id=${profile.id} and a.status='active' and a.revoked_at is null)) order by o.name,p.semantic_id`;
  const panels=await Promise.all(subjects.map(async s=>{
    const org=String(s.organization_id),learner=String(s.learner_id);
    const [authorities,agreement,requests]=await Promise.all([
      sql`select a.id, p.semantic_id from learner_representative_authorities a join profiles p on p.id=a.representative_profile_id where a.organization_id=${org} and a.learner_id=${learner} and a.status='active' and a.revoked_at is null and (a.learner_id=${profile.id} or a.representative_profile_id=${profile.id})`,
      sql`select processing_countries,approved_providers,retention_schedule,school_contact,vitech_contact,status from school_processing_agreements where organization_id=${org}`,
      sql`select request_type,status,created_at from privacy_rights_requests where organization_id=${org} and learner_id=${learner} order by created_at desc limit 20`,
    ]);
    const decisions=await Promise.all(OPTIONAL_PURPOSES.map(async purpose=>({purpose,allowed:await optionalProcessingAllowed(org,learner,purpose)})));
    return <section className="panel" key={`${org}:${learner}`}><h2>{String(s.name)} — {String(s.semantic_id)}</h2><p>Policy / Chính sách: {PRIVACY_POLICY_VERSION}. Signing in is separate from these decisions. / Đăng nhập khác các quyết định này.</p>
      {agreement[0]?<p>Actual disclosed countries/providers/retention / Nước, nhà cung cấp, lưu giữ công bố: {String(agreement[0].processing_countries)}; {String(agreement[0].approved_providers)}; {String(agreement[0].retention_schedule)}. Contacts / Đầu mối: {String(agreement[0].school_contact)} / {String(agreement[0].vitech_contact)}. Status: {String(agreement[0].status)}</p>:<p>School processing agreement not approved / Chưa phê duyệt hợp đồng xử lý trường.</p>}
      {decisions.map(({purpose,allowed})=><div className="panel" key={purpose}><h3>{PURPOSE_LABELS[purpose]}</h3><p>{allowed?'Both current family decisions recorded / Đã ghi hai quyết định hiện hành':'Blocked or awaiting current decisions / Bị chặn hoặc chờ quyết định hiện hành'}{(purpose==='industry_network'||purpose==='capsule_exchange')?' — exchange not connected / trao đổi chưa kết nối':''}</p>
        <form action={recordOptionalConsent}><input type="hidden" name="organizationId" value={org}/><input type="hidden" name="learnerId" value={learner}/><input type="hidden" name="purpose" value={purpose}/><input type="hidden" name="policyVersion" value={PRIVACY_POLICY_VERSION}/>
          <label>Verified representative / Đại diện đã xác minh<select name="authorityId" required defaultValue=""><option value="" disabled>Choose / Chọn</option>{authorities.map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.semantic_id)}</option>)}</select></label>
          <label><input type="checkbox" name="agree" required/> I have read the notice and agree only to this purpose / Tôi đã đọc thông báo và chỉ đồng ý mục đích này.</label><button className="button primary" name="decision" value="agree" disabled={!authorities.length||purpose==='industry_network'||purpose==='capsule_exchange'}>Record my decision / Ghi quyết định của tôi</button>
        </form><form action={recordOptionalConsent}><input type="hidden" name="organizationId" value={org}/><input type="hidden" name="learnerId" value={learner}/><input type="hidden" name="purpose" value={purpose}/><button className="button" name="decision" value="withdraw">Decline / withdraw — Từ chối / rút lại</button></form></div>)}
      <form action={submitPrivacyRightsRequest}><input type="hidden" name="organizationId" value={org}/><input type="hidden" name="learnerId" value={learner}/><label>Rights request / Yêu cầu quyền<select name="requestType"><option value="access">Access / Truy cập</option><option value="correction">Correction / Sửa</option><option value="restriction">Restriction / Hạn chế</option><option value="objection">Objection / Phản đối</option><option value="withdrawal">Withdrawal / Rút lại</option><option value="deletion">Deletion review / Rà soát xóa</option></select></label><button className="button">Submit for review / Gửi rà soát</button><p>This creates a review request; it does not immediately erase records. / Tạo yêu cầu rà soát, không xóa hồ sơ ngay.</p></form>
      <ul>{requests.map((r,i)=><li key={i}>{String(r.request_type)} — {String(r.status)} — {String(r.created_at)}</li>)}</ul>
    </section>;
  }));
  const sourceSchema=await sql`select to_regclass('public.ai_study_sources') is not null as ready`;
  const sources=profile.account_type==='student'&&sourceSchema[0]?.ready?await sql`select id,organization_id,title,status from ai_study_sources where learner_id=${profile.id} and status<>'deleted' order by created_at desc limit 100`:[];
  return <main className="workspacePage"><div className="workspaceContent"><h1>Privacy and choices / Quyền riêng tư và lựa chọn</h1><DataCaptureNotice/>{panels.length?panels:<p>No authorised learner/institution scope. / Không có phạm vi học viên/cơ sở được phép.</p>}<section className="panel"><h2>My provider sources / Nguồn của tôi</h2><p>Deletion does not require optional AI to be enabled. Historical metadata and linked learning records are retained for the separate rights review. / Xóa tệp không yêu cầu bật AI; metadata và hồ sơ liên kết được rà soát riêng.</p>{sources.map(source=><div key={String(source.id)}><strong>{String(source.title)}</strong><DeleteStudySource organizationId={String(source.organization_id)} sourceId={String(source.id)}/></div>)}</section></div></main>;
}
