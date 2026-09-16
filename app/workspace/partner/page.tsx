import Link from "next/link";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { assignTeacher, createClass, enrollStudent, requestPartnerAccess } from "./actions";

export const dynamic = "force-dynamic";

export default async function PartnerWorkspacePage() {
  const user = await getSessionUser();
  if (!user) return <PartnerGate mode="signin" />;

  const profile = await getCurrentProfile();
  const sql = getDb();

  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) {
    const learnerProfile = profile;
    const request = learnerProfile
      ? await sql`
          select organization_name, organization_type, status, updated_at
          from partner_onboarding_requests
          where requester_profile_id = ${learnerProfile.id}
          limit 1
        `
      : [];

    return (
      <main className="workspacePage">
        <PartnerHeader />
        <div className="workspaceContent">
          <section className="panel gatePanel">
            <div className="eyebrow">Controlled partner onboarding</div>
            <h1 className="workspaceHeroTitle">Bring your school or training center into Career Compass Junior.</h1>
            <p className="muted">Partner administrator privileges are approved separately. Submitting this form does not grant elevated access automatically.</p>
            {request[0] && <div className="statusBanner"><strong>Current request: {String(request[0].status)}</strong><span>{String(request[0].organization_name)} · {String(request[0].organization_type).replace("_", " ")}</span></div>}
            <form action={requestPartnerAccess} className="workspaceForm partnerRequestForm">
              <label><span>School / center name</span><input name="organizationName" required defaultValue={String(request[0]?.organization_name || "")} /></label>
              <label><span>Organization type</span><select name="organizationType" defaultValue={String(request[0]?.organization_type || "training_center")}><option value="training_center">Training center</option><option value="school">School</option></select></label>
              <button className="button primary" type="submit">Submit partner access request</button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const organizations = profile.account_type === "platform_admin"
    ? await sql`select id, name, organization_type, semantic_id from organizations where status='active' order by name`
    : await sql`
        select o.id, o.name, o.organization_type, o.semantic_id
        from organization_memberships om
        join organizations o on o.id = om.organization_id
        where om.profile_id = ${profile.id}
          and om.role = 'partner_admin'
          and om.status = 'active'
          and o.status = 'active'
        order by o.name
      `;

  const organization = organizations[0];
  if (!organization) return <PartnerGate mode="membership" />;
  const organizationId = String(organization.id);

  const classes = await sql`
    select c.id, c.name, c.level_label, c.academic_cycle,
      count(distinct cm.student_id)::int as student_count,
      count(distinct ta.teacher_id)::int as teacher_count
    from classes c
    left join class_memberships cm on cm.class_id = c.id and cm.status = 'active'
    left join teacher_assignments ta on ta.class_id = c.id
    where c.organization_id = ${organizationId} and c.status = 'active'
    group by c.id
    order by c.name
  `;

  const totals = await sql`
    select
      (select count(distinct cm.student_id)::int from class_memberships cm join classes c on c.id=cm.class_id where c.organization_id=${organizationId} and cm.status='active') as students,
      (select count(distinct ta.teacher_id)::int from teacher_assignments ta join classes c on c.id=ta.class_id where c.organization_id=${organizationId}) as teachers,
      (select count(*)::int from assignments a join classes c on c.id=a.class_id where c.organization_id=${organizationId} and a.status='published') as assignments,
      (select count(*)::int from payments p where p.organization_id=${organizationId} and p.status='pending') as pending_payments
  `;
  const total = totals[0] || {};

  return (
    <main className="workspacePage">
      <PartnerHeader />
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">Partner organization</div><h1 className="workspaceHeroTitle">{String(organization.name)}</h1><p className="muted">{String(organization.organization_type).replace("_", " ")} · {String(organization.semantic_id)}</p></div>
          {organizations.length > 1 && <span className="pill">{organizations.length} managed organizations</span>}
        </section>

        <section className="metricGrid">
          <Metric label="Active classes" value={String(classes.length)} detail="Current delivery" />
          <Metric label="Learners" value={String(total.students || 0)} detail="Active class memberships" />
          <Metric label="Teachers" value={String(total.teachers || 0)} detail="Assigned educators" />
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">Program delivery</div><h2 className="workspaceTitle">Classes</h2>
            {classes.length === 0 ? <EmptyState text="Create your first class to begin assigning teachers and learners." /> : <div className="workspaceList">{classes.map((item) => <div className="workspaceRow" key={String(item.id)}><div><strong>{String(item.name)}</strong><div className="muted">{String(item.level_label || "Level not set")} · {String(item.academic_cycle || "Cycle not set")}</div></div><span className="pill">{String(item.student_count)} students · {String(item.teacher_count)} teachers</span></div>)}</div>}
          </article>

          <article className="panel">
            <div className="eyebrow">Create class</div><h2 className="workspaceTitle">New delivery group</h2>
            <form action={createClass} className="workspaceForm">
              <input type="hidden" name="organizationId" value={organizationId} />
              <label><span>Class name</span><input name="name" required placeholder="Junior A1 · Saturday" /></label>
              <label><span>Level</span><input name="levelLabel" placeholder="Beginner / A1" /></label>
              <label><span>Academic cycle</span><input name="academicCycle" placeholder="2026–2027" /></label>
              <button className="button primary" type="submit">Create class</button>
            </form>
          </article>
        </section>

        <section className="workspaceGrid">
          <article className="panel">
            <div className="eyebrow">People</div><h2 className="workspaceTitle">Assign activated teacher</h2>
            {classes.length === 0 ? <EmptyState text="Create a class first." /> : <form action={assignTeacher} className="workspaceForm"><label><span>Class</span><select name="classId">{classes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}</select></label><label><span>Teacher semantic ID</span><input name="teacherSemanticId" required placeholder="vn-teacher-…" /></label><button className="button soft" type="submit">Assign teacher</button></form>}
          </article>

          <article className="panel">
            <div className="eyebrow">Learners</div><h2 className="workspaceTitle">Enroll activated student</h2>
            {classes.length === 0 ? <EmptyState text="Create a class first." /> : <form action={enrollStudent} className="workspaceForm"><label><span>Class</span><select name="classId">{classes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}</select></label><label><span>Learner semantic ID</span><input name="studentSemanticId" required placeholder="vn-learner-…" /></label><button className="button soft" type="submit">Enroll learner</button></form>}
          </article>
        </section>

        <section className="panel">
          <div className="eyebrow">Operational pulse</div><h2 className="workspaceTitle">Live program state</h2>
          <div className="miniGrid partnerPulse"><div className="miniCard light"><strong>{String(total.assignments || 0)}</strong><span>published assignments</span></div><div className="miniCard light"><strong>{String(total.pending_payments || 0)}</strong><span>pending payment records</span></div><div className="miniCard light"><strong>{String(classes.reduce((sum, item) => sum + Number(item.student_count || 0), 0))}</strong><span>class enrollments</span></div><div className="miniCard light"><strong>{String(classes.reduce((sum, item) => sum + Number(item.teacher_count || 0), 0))}</strong><span>teacher assignments</span></div></div>
        </section>
      </div>
    </main>
  );
}

function PartnerGate({ mode }: { mode: "signin" | "membership" }) {
  const signIn = mode === "signin";
  return <main className="workspacePage"><PartnerHeader /><div className="workspaceContent"><section className="panel gatePanel"><h2>{signIn ? "Sign in required" : "Partner membership not assigned"}</h2><p className="muted">{signIn ? "Sign in before opening the partner onboarding and management workspace." : "Your account has partner-level access but is not attached to an active organization yet."}</p><div className="actions"><Link className="button primary" href={`/auth/sign-in?callbackURL=${encodeURIComponent("/workspace/partner")}`}>Sign in</Link><Link className="button" href="/portal/partner">View partner preview</Link></div></section></div></main>;
}

function PartnerHeader() { return <header className="topbar"><Link className="brand" href="/"><span className="brandMark">CC</span><span>Career Compass Junior</span></Link><div><strong>Partner Workspace</strong><div className="muted" style={{ fontSize: 12 }}>Schools · training centers · live delivery</div></div><Link className="pill" href="/portal/partner">Portal preview</Link></header>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>; }
function EmptyState({ text }: { text: string }) { return <div className="emptyState"><span>◎</span><p className="muted">{text}</p></div>; }
