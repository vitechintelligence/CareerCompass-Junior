import Link from "next/link";

const roles = [
  {
    role: "student",
    href: "/portal/student",
    workspaceHref: "/learn/unit-1?lang=en",
    icon: "🧭",
    title: "Student / Học sinh",
    copy: "Interactive books, English practice, activities, progress and achievements.",
    tags: ["Books", "Activities", "Progress"]
  },
  {
    role: "teacher",
    href: "/portal/teacher",
    workspaceHref: "/workspace/teacher",
    icon: "✏️",
    title: "Teacher / Giáo viên",
    copy: "Classes, attendance, assignments, submissions, feedback and learning evidence.",
    tags: ["Classes", "Feedback", "Evidence"]
  },
  {
    role: "partner",
    href: "/portal/partner",
    workspaceHref: "/workspace/partner",
    icon: "🏫",
    title: "Partner / Đối tác",
    copy: "Manage your teachers, students, classes, resources, program delivery and reporting.",
    tags: ["People", "Programs", "Reporting"]
  }
] as const;

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brandMark">CC</span>
          <span>Career Compass Junior Mastery</span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#learning">Interactive Learning</a>
          <a href="#partners">Partners</a>
        </nav>
        <div className="lessonHeaderActions">
          <Link className="pill" href="/auth/sign-in">Sign in</Link>
          <Link className="pill" href="/auth/sign-up">Activate learner</Link>
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">English × Life Skills × Career Discovery</div>
          <h1>Learn who you are. Build where you can go.</h1>
          <p className="lead">
            A bilingual learning platform that turns Career Compass Junior books into guided, interactive learning—while giving teachers and partner schools one coherent place to support every learner.
          </p>
          <p className="muted">Nền tảng song ngữ biến sách Career Compass Junior thành hành trình học tương tác, dễ theo dõi và phù hợp với học sinh Việt Nam.</p>
          <div className="actions">
            <Link className="button primary" href="/learn/unit-1?lang=en">Try Unit 1 Interactive</Link>
            <Link className="button soft" href="/workspace/teacher">Teacher Workspace</Link>
            <Link className="button" href="/workspace/partner">Partner Workspace</Link>
          </div>
        </div>
        <div className="heroBoard" aria-label="Program snapshot">
          <div className="heroBoardInner">
            <span className="pill">Mastery Learning Journey</span>
            <h3 style={{ fontSize: 30, marginTop: 18 }}>One learning journey. Three connected portals.</h3>
            <p style={{ opacity: .78, lineHeight: 1.6 }}>What a student does becomes useful evidence for teachers and useful program intelligence for partner organizations.</p>
            <div className="miniGrid">
              <div className="miniCard"><strong>96</strong><span>lesson-ready sessions</span></div>
              <div className="miniCard"><strong>EN · VI</strong><span>bilingual by design</span></div>
              <div className="miniCard"><strong>3</strong><span>role-based portals</span></div>
              <div className="miniCard"><strong>1</strong><span>evidence layer</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="sectionHeader">
          <div className="eyebrow">Connected platform</div>
          <h2>Different users. One coherent program.</h2>
          <p className="muted">Each portal exposes only the tools that user needs, while classes, book progress, submissions, feedback and learning evidence stay connected underneath.</p>
        </div>
        <div className="cardGrid">
          {roles.map((item) => (
            <div className="card" key={item.role}>
              <div className="cardIcon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p className="muted">{item.copy}</p>
              <div className="tagRow">{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
              <div className="actions">
                <Link className="button soft" href={item.href}>Preview</Link>
                <Link className="button primary" href={item.workspaceHref}>{item.role === "student" ? "Start learning" : "Open workspace"}</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="learning">
        <div className="sectionHeader">
          <div className="eyebrow">Book → interactive learning</div>
          <h2>The printed program becomes a living e-learning experience.</h2>
          <p className="muted">Every book can be represented as units and activities: Look–Listen–Say vocabulary, speaking models, listening, reflection, matching, sorting, writing, projects and teacher-reviewed evidence. The book remains the curriculum anchor; the app makes it easier to practice, repeat and document mastery.</p>
          <div className="actions">
            <Link className="button primary" href="/learn/unit-1?lang=en">Open the live Unit 1 experience</Link>
            <Link className="button" href="/learn/unit-1?lang=vi">Mở Bài 1 bằng tiếng Việt</Link>
            <Link className="button" href="/learn/CCJ-MASTERY-BEGINNER/U01?lang=en">Database-driven book view</Link>
          </div>
        </div>
        <div className="cardGrid">
          <div className="card"><div className="cardIcon">🎧</div><h3>Learn & practice</h3><p className="muted">Audio-ready vocabulary, speaking prompts and scaffolded bilingual instructions.</p></div>
          <div className="card"><div className="cardIcon">🧩</div><h3>Do & discover</h3><p className="muted">Interactive activities, choices, reflections, projects and age-appropriate career discovery.</p></div>
          <div className="card"><div className="cardIcon">🌱</div><h3>Show growth</h3><p className="muted">Progress and teacher-validated evidence accumulate into a learner-owned development record.</p></div>
        </div>
      </section>

      <section className="section" id="partners">
        <div className="portalIntro">
          <div className="eyebrow">For schools & training centers</div>
          <h2 style={{ marginTop: 10 }}>Manage delivery without losing the learner.</h2>
          <p className="lead" style={{ fontSize: 18 }}>Partner administrators can manage teachers, students, classes, assignments, attendance, resources, payments and reporting—without turning the system into a heavy ERP.</p>
          <div className="actions">
            <Link className="button primary" href="/workspace/partner">Open Partner Workspace</Link>
            <Link className="button" href="/workspace/teacher">Open Teacher Workspace</Link>
            <Link className="button" href="/auth/sign-up?callbackURL=%2Fworkspace%2Fpartner">Request partner access</Link>
          </div>
        </div>
      </section>

      <footer className="footer">© 2026 ViTech Intelligence · Career Compass Junior Mastery · Built for bilingual learning and responsible educational evidence.</footer>
    </main>
  );
}
