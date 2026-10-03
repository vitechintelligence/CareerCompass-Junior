import Link from "next/link";

export const metadata={title:"Learner Data Notice | Career Compass Junior"};

export default function LearnerDataNoticePage(){
  return <main className="workspacePage">
    <header className="topbar"><Link className="brand" href="/">Career Compass Junior</Link><strong>Learner Data Notice</strong><Link className="pill" href="/workspace">Workspace</Link></header>
    <div className="workspaceContent">
      <section className="panel">
        <div className="eyebrow">What the service records</div>
        <h1 className="workspaceHeroTitle">Learning data is used to run the learning experience and preserve evidence.</h1>
        <p>Depending on the features enabled by a school or learner, Career Compass Junior can record account/profile details, institution and class relationships, book enrollment and progress, activity attempts, assignments and revisions, teacher feedback, assessment results, learning-evidence capsules, attendance, consent records, and integration/audit metadata.</p>
      </section>
      <section className="workspaceGrid">
        <article className="panel"><h2>AI and uploaded content</h2><p className="muted">Assistive AI features are controlled separately from ordinary learning records. Institution AI mode and consent/policy controls apply where those features are enabled. The platform should not treat AI-generated output as verified learner mastery.</p></article>
        <article className="panel"><h2>Who can see records</h2><p className="muted">Access is role-, organization-, class-, enrollment- and resource-scoped. Institution reports require the relevant relationship and product consent controls. Advertised public previews are separate from protected learner records.</p></article>
        <article className="panel"><h2>Export and review</h2><p className="muted">Signed-in learners can download an account-scoped JSON export. A deletion request starts a review instead of automatically destroying linked educational evidence or institution records.</p></article>
        <article className="panel"><h2>Institution responsibilities</h2><p className="muted">ViTech provides product controls; schools and training centers remain responsible for their own notices, legal basis, guardian/learner approvals, retention choices, and local implementation requirements.</p></article>
      </section>
    </div>
  </main>;
}
