import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getDb } from "@/lib/db";
import { isRiskyFeatureEnabled } from "@/lib/feature-flags";
import { reviewProfessorViPack } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherAiLearningPage() {
  const user = await getSessionUser();
  if (!user) return <Gate copy="Sign in with your teacher account." />;
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active" || !["teacher","platform_admin"].includes(profile.account_type)) {
    return <Gate copy="Teacher access is required." />;
  }
  if (!isRiskyFeatureEnabled("professorViAiStudy")) {
    return <Gate copy="Professor Vi is still behind the Phase A rollout switch." />;
  }

  const sql = getDb();
  const schema = await sql`select to_regclass('public.ai_study_packs') as table_name`;
  if (!schema[0]?.table_name) return <Gate copy="Migration 015 is prepared but not active in this environment." />;

  const organizations = profile.account_type === "platform_admin"
    ? await sql`
        select o.id, o.name
        from organizations o
        join organization_features f on f.organization_id=o.id
        where o.status='active' and f.feature_key='professor_vi_ai_study_lab' and f.enabled=true
        order by o.name
      `
    : await sql`
        select distinct o.id, o.name
        from teacher_assignments ta
        join classes c on c.id=ta.class_id and c.status='active'
        join organizations o on o.id=c.organization_id and o.status='active'
        join organization_features f on f.organization_id=o.id
        where ta.teacher_id=${profile.id}
          and f.feature_key='professor_vi_ai_study_lab'
          and f.enabled=true
        order by o.name
      `;
  const organization = organizations[0];
  if (!organization) return <Gate copy="No assigned institution has Professor Vi enabled." />;
  const organizationId = String(organization.id);

  const packs = profile.account_type === "platform_admin"
    ? await sql`
        select p.id, p.pack_type, p.title, p.content, p.grounding_refs, p.review_status,
          learner.display_name, learner.semantic_id, p.created_at
        from ai_study_packs p
        join profiles learner on learner.id=p.learner_id
        where p.organization_id=${organizationId}
          and p.review_status in ('pending_review','changes_requested')
        order by p.created_at asc
        limit 50
      `
    : await sql`
        select p.id, p.pack_type, p.title, p.content, p.grounding_refs, p.review_status,
          learner.display_name, learner.semantic_id, p.created_at
        from ai_study_packs p
        join profiles learner on learner.id=p.learner_id
        where p.organization_id=${organizationId}
          and p.review_status in ('pending_review','changes_requested')
          and exists (
            select 1
            from teacher_assignments ta
            join class_memberships cm on cm.class_id=ta.class_id
            join classes c on c.id=ta.class_id and c.status='active'
            where ta.teacher_id=${profile.id}
              and cm.student_id=p.learner_id
              and cm.status='active'
              and c.organization_id=${organizationId}
          )
        order by p.created_at asc
        limit 50
      `;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>Professor Vi · Review Queue</strong><div className="muted" style={{ fontSize: 12 }}>Human release control</div></div>
        <Link className="pill" href="/workspace/teacher">Teacher Workspace</Link>
      </header>
      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div><div className="eyebrow">Needs my attention</div><h1 className="workspaceHeroTitle">AI-generated learning packs</h1><p className="muted">Review source grounding and educational suitability before release when school policy requires it.</p></div>
          <span className="pill">{packs.length} pending</span>
        </section>

        {packs.length === 0 ? <section className="panel emptyState"><span>✓</span><p className="muted">No Professor Vi packs are waiting for review.</p></section> : (
          <section className="workspaceList">
            {packs.map((pack) => {
              const content = pack.content && typeof pack.content === "object" ? pack.content as Record<string, unknown> : {};
              return <article className="panel" key={String(pack.id)}>
                <div className="workspaceRow" style={{ padding: 0 }}>
                  <div><div className="eyebrow">{String(pack.pack_type).replace("_"," ")}</div><h2 className="workspaceTitle">{String(pack.title)}</h2><div className="muted">Learner: {String(pack.display_name || pack.semantic_id || "Student")}</div></div>
                  <span className="pill">{String(pack.review_status).replace("_"," ")}</span>
                </div>
                {content.contentMarkdown && <p style={{ whiteSpace: "pre-wrap" }}>{String(content.contentMarkdown).slice(0, 12000)}</p>}
                {content.questionCount && <p className="muted">Generated quiz · {String(content.questionCount)} questions. Objective answers remain server-owned and are not shown in the learner launch contract.</p>}
                <form action={reviewProfessorViPack} className="workspaceForm">
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <input type="hidden" name="packId" value={String(pack.id)} />
                  <label><span>Review note</span><textarea name="reviewNote" rows={3} maxLength={2000} placeholder="Optional release note or required correction." /></label>
                  <div className="actions">
                    <button className="button primary" name="decision" value="release" type="submit">Release to learner</button>
                    <button className="button" name="decision" value="changes_requested" type="submit">Request changes</button>
                  </div>
                </form>
              </article>;
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function Gate({ copy }: { copy: string }) {
  return <main className="workspacePage"><header className="topbar"><Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link><strong>Professor Vi · Review Queue</strong><Link className="pill" href="/workspace/teacher">Teacher Workspace</Link></header><div className="workspaceContent"><section className="panel gatePanel"><h2>Professor Vi</h2><p className="muted">{copy}</p></section></div></main>;
}
