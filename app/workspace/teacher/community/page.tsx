import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { hasCurrentCommunityAgreement } from "@/lib/community-access";
import { LEARNER_AGE_BANDS, LEARNER_AGE_PROFILES } from "@/lib/learner-age-bands";
import { CommunityAgreementPanel } from "@/app/workspace/community/CommunityAgreementPanel";
import { setCommunityStudentAccess } from "@/app/workspace/community/actions";
import { createCommunitySeason } from "@/app/workspace/partner/community/actions";

export const dynamic = "force-dynamic";

export default async function TeacherCommunityPage() {
  const user = await getSessionUser();
  if (!user) return <Gate signedIn={false} />;

  const profile = await getCurrentProfile();
  if (!profile || !["teacher","platform_admin"].includes(profile.account_type)) return <Gate signedIn />;

  const sql = getDb();
  const schemaRows = await sql`select to_regclass('public.community_staff_permissions') as permissions`;
  if (!schemaRows[0]?.permissions) {
    return <main className="workspacePage"><Header /><div className="workspaceContent"><section className="statusBanner"><strong>Community controls are prepared but not active yet.</strong><span>Migration 005 must be approved before teachers can enable learners or manage community activities.</span></section></div></main>;
  }

  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name, locale from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name, o.locale
        from organization_memberships om
        join organizations o on o.id=om.organization_id
        where om.profile_id=${profile.id}
          and om.role='teacher'
          and om.status='active'
          and o.status='active'
        order by o.name
      `;

  const organization = organizations[0];
  if (!organization) return <Gate signedIn copy="Your teacher account is not attached to an active institution." />;
  const organizationId = String(organization.id);
  const locale = String(organization.locale) === "en" ? "en" : "vi";
  const agreementAccepted = await hasCurrentCommunityAgreement(organizationId, profile.id);

  const permissionRows = profile.account_type === "platform_admin"
    ? [{ can_initiate_seasons: true, can_enable_students: true, can_moderate: true, can_assign_advisors: true }]
    : await sql`
        select can_initiate_seasons, can_enable_students, can_moderate, can_assign_advisors
        from community_staff_permissions
        where organization_id=${organizationId}
          and teacher_id=${profile.id}
        limit 1
      `;
  const permission = permissionRows[0];

  const accessRows = permission?.can_enable_students ? await sql`
    select p.semantic_id, p.display_name, csa.age_band, csa.status
    from community_student_access csa
    join profiles p on p.id=csa.student_id
    where csa.organization_id=${organizationId}
    order by csa.updated_at desc
    limit 15
  ` : [];

  const now = new Date();
  const defaultYear = now.getUTCFullYear();
  const defaultQuarter = Math.floor(now.getUTCMonth() / 3) + 1;

  return (
    <main className="workspacePage">
      <Header />
      {!agreementAccepted && <CommunityAgreementPanel organizationId={organizationId} locale={locale} />}
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">Delegated school community role</div><h1 className="workspaceHeroTitle">{String(organization.name)}</h1><p className="muted">Teachers only receive the community controls explicitly delegated by the school administrator. Student participation is never enabled automatically.</p></div>
          <span className="pill">{String(profile.semantic_id)}</span>
        </section>

        {!permission ? (
          <section className="panel"><h2 className="workspaceTitle">Community permission not assigned</h2><p className="muted">Ask the school administrator to enable the community permissions needed for your role.</p></section>
        ) : (
          <>
            <section className="metricGrid">
              <Metric label="Enable students" value={permission.can_enable_students ? "Yes" : "No"} />
              <Metric label="Initiate seasons" value={permission.can_initiate_seasons ? "Yes" : "No"} />
              <Metric label="Moderate" value={permission.can_moderate ? "Yes" : "No"} />
              <Metric label="Assign advisors" value={permission.can_assign_advisors ? "Yes" : "No"} />
            </section>

            {permission.can_enable_students && <section className="workspaceGrid">
              <article className="panel">
                <div className="eyebrow">Learner access</div>
                <h2 className="workspaceTitle">Enable an approved student</h2>
                <form action={setCommunityStudentAccess} className="workspaceForm">
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <label><span>Learner semantic ID</span><input name="studentSemanticId" required placeholder="vn-learner-…" maxLength={100} /></label>
                  <label><span>Age / grade experience</span><select name="ageBand" defaultValue="10-13">{LEARNER_AGE_BANDS.map((key) => <option value={key} key={key}>{LEARNER_AGE_PROFILES[key].ageLabelEn} · {LEARNER_AGE_PROFILES[key].gradeLabelEn}</option>)}</select></label>
                  <label className="communityCheck"><input type="checkbox" name="guardianConsentConfirmed" required /><span>The institution confirms required parent/guardian permission has been obtained.</span></label>
                  <label className="communityCheck"><input type="checkbox" name="learnerAcknowledged" required /><span>The learner acknowledgement has been recorded.</span></label>
                  <button className="button primary" type="submit" disabled={!agreementAccepted}>Enable community access</button>
                </form>
              </article>
              <article className="panel">
                <div className="eyebrow">Recently enabled</div>
                <h2 className="workspaceTitle">Learner community access</h2>
                {accessRows.length === 0 ? <p className="muted">No learners have been enabled yet.</p> : <div className="workspaceList">{accessRows.map((item) => <div className="workspaceRow" key={String(item.semantic_id)}><div><strong>{String(item.display_name || item.semantic_id)}</strong><div className="muted">{String(item.semantic_id)}</div></div><span className="pill">{String(item.age_band)} · {String(item.status)}</span></div>)}</div>}
              </article>
            </section>}

            {permission.can_initiate_seasons && <section className="panel">
              <div className="eyebrow">Initiate a quarter</div>
              <h2 className="workspaceTitle">Start a school-approved community season</h2>
              <p className="muted">Your school administrator delegated season initiation. Moderation, publication and network showcase controls remain limited by your assigned permissions.</p>
              <form action={createCommunitySeason} className="workspaceForm">
                <input type="hidden" name="organizationId" value={organizationId} />
                <label><span>English title</span><input name="titleEn" defaultValue={`Q${defaultQuarter} STEAM Builders`} required maxLength={160} /></label>
                <label><span>Vietnamese title</span><input name="titleVi" defaultValue={`Thử thách STEAM Quý ${defaultQuarter}`} required maxLength={160} /></label>
                <div className="inlineFields"><label><span>Year</span><input name="year" type="number" min="2025" max="2100" defaultValue={defaultYear} required /></label><label><span>Quarter</span><select name="quarter" defaultValue={String(defaultQuarter)}><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option></select></label></div>
                <div className="communityCheckGrid">{LEARNER_AGE_BANDS.map((key) => <label className="communityCheck" key={key}><input type="checkbox" name="ageBands" value={key} defaultChecked /><span>{LEARNER_AGE_PROFILES[key].ageLabelEn}</span></label>)}</div>
                <div className="inlineFields"><label><span>Starts</span><input name="startsOn" type="date" required /></label><label><span>Submission due</span><input name="submissionDueOn" type="date" required /></label></div>
                <label><span>Showcase date</span><input name="showcaseOn" type="date" /></label>
                <input type="hidden" name="leaderboardMode" value="podium_only" />
                <input type="hidden" name="maxTeamSize" value="8" />
                <label className="communityCheck"><input type="checkbox" name="allowStudentTeamCreation" defaultChecked /><span>Students may create teams after access approval</span></label>
                <label className="communityCheck"><input type="checkbox" name="allowPeerKudos" defaultChecked /><span>Structured peer kudos during showcase</span></label>
                <label className="communityCheck"><input type="checkbox" name="advisorFeedbackRequired" defaultChecked /><span>Advisor feedback required</span></label>
                <button className="button soft" type="submit" disabled={!agreementAccepted}>Create draft season</button>
              </form>
            </section>}
          </>
        )}
      </div>
    </main>
  );
}

function Header() {
  return <header className="topbar"><Link className="brand" href="/workspace/teacher"><VitechMark /><span>Career Compass Junior</span></Link><div><strong>Teacher Community Controls</strong><div className="muted" style={{ fontSize: 12 }}>Delegated by the school administrator</div></div><Link className="pill" href="/workspace/teacher">Teacher Workspace</Link></header>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">School-delegated permission</span></div>;
}

function Gate({ signedIn, copy }: { signedIn: boolean; copy?: string }) {
  return <main className="workspacePage"><Header /><div className="workspaceContent"><section className="panel gatePanel"><h2>{signedIn ? "Teacher community access required" : "Sign in required"}</h2><p className="muted">{copy || "Sign in with a teacher account to use delegated community controls."}</p>{!signedIn && <Link className="button primary" href="/auth/sign-in?callbackURL=%2Fworkspace%2Fteacher%2Fcommunity">Sign in</Link>}</section></div></main>;
}
