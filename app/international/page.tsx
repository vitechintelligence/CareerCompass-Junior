import type { Metadata } from "next";
import Link from "next/link";
import styles from "./international.module.css";

export const metadata: Metadata = {
  title: "Career Compass Junior | English, Human Skills & Future Readiness",
  description:
    "Career Compass Junior is an international learning program for ages 7–12 using English to build communication, human skills, self-development and future readiness.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Career Compass Junior | English, Human Skills & Future Readiness",
    description:
      "International Career Compass Junior learning experience for the Philippines and ASEAN.",
    type: "website",
  },
};

const logoData =
  "data:image/webp;base64,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";

const books = [
  ["01", "Career Compass Junior", "English Communication · Human Skills · Future Discovery"],
  ["02", "Career Compass Junior Mastery", "Beginner · Guided fluency · Integrated discovery"],
  ["03", "MY COMPASS", "Teen English · Life Skills · Career Discovery"],
  ["04", "EERS Action City", "Early English · Phonics · Learning through action"],
] as const;

const skills = [
  ["Communication", "Express ideas clearly, listen actively and use English for real interaction."],
  ["Reasoning", "Explain choices, compare options and build confidence in thinking aloud."],
  ["Social growth", "Collaborate, take turns, understand others and contribute to a group."],
  ["Self-development", "Reflect on strengths, interests, habits and personal progress."],
  ["Creativity", "Build, imagine, present and improve ideas through guided projects."],
  ["Future readiness", "Connect school learning with roles, possibilities and changing work."],
  ["Academic thinking", "Ask better questions, organise information and explain evidence."],
  ["Leadership", "Take initiative, communicate responsibility and learn to guide with care."],
] as const;

const journey = [
  ["01", "Who am I?", "Strengths, voice, confidence and self-awareness."],
  ["02", "What interests me?", "Curiosity, subjects, activities and emerging preferences."],
  ["03", "What can I do?", "Skills demonstrated through communication, projects and practice."],
  ["04", "Where might I fit?", "Age-appropriate exposure to roles, environments and possibilities."],
  ["05", "How do I decide?", "Reflection, reasoning and making choices with better information."],
] as const;

export default function InternationalLanding() {
  return (
    <main className={styles.page}>
      <div className={styles.launchStrip}>
        <span>Philippines & ASEAN · International Learning Edition</span>
        <span>Career Compass Junior · Learn today · Build tomorrow</span>
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoData} alt="ViTech Intelligence" />
          <span><b>Career Compass Junior</b><small>by ViTech Intelligence Solutions</small></span>
        </Link>
        <nav className={styles.nav} aria-label="International landing navigation">
          <a href="#books">Books</a><a href="#difference">Why it is different</a><a href="#journey">Journey</a><a href="#portals">Portals</a><a href="#centers">For partners</a>
        </nav>
        <Link className={styles.signIn} href="/auth/sign-in">Sign in</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Ages 7–12 · Effective English Communication + Human Skills</span>
          <h1>Don’t just teach English. <em>Build the child.</em></h1>
          <p>Career Compass Junior uses English as a shared global language and a practice environment for something bigger — helping children communicate effectively, reason, collaborate, create, lead, reflect and gradually discover where they may fit in the future.</p>
          <div className={styles.note}><b>A modern alternative to textbook-only learning:</b> children use English to think, solve, explain, connect and grow.</div>
          <div className={styles.actions}>
            <a className={styles.primary} href="#books">See the program books →</a>
            <Link className={styles.secondary} href="/workspace/partner">For schools & learning centers</Link>
          </div>
        </div>
        <div className={styles.heroVisual} aria-label="Career Compass learning model">
          <div className={styles.orbit}><span>COMMUNICATE</span><span>THINK</span><span>CREATE</span><span>REFLECT</span><strong>CAREER<br/>COMPASS<br/>JUNIOR</strong></div>
          <div className={styles.visualCaption}>English becomes the medium for real decisions, ideas and growth.</div>
        </div>
      </section>

      <section id="books" className={styles.section}>
        <div className={styles.sectionHead}><span>ViTech education books</span><h2>A connected collection designed around different stages of growth.</h2><p>The books anchor classroom learning. The platform extends practice, feedback, progress and evidence beyond the printed page.</p></div>
        <div className={styles.bookGrid}>{books.map(([n,title,copy],i)=><article className={styles.book} key={title}><div className={`${styles.bookCover} ${styles[`cover${i+1}`]}`}><small>ViTech Intelligence</small><b>{title}</b><span>{copy}</span><i>{n}</i></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section id="difference" className={`${styles.section} ${styles.tint}`}>
        <div className={styles.splitHead}><div><span>What changes</span><h2>English is the medium. Growing capability is the destination.</h2></div><p>Students do not only finish language exercises. They use language to make meaning, explain decisions, work with others and create visible evidence of development.</p></div>
        <div className={styles.skillGrid}>{skills.map(([title,copy],i)=><article key={title}><span>{String(i+1).padStart(2,"0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section id="journey" className={styles.section}>
        <div className={styles.sectionHead}><span>Long-term development journey</span><h2>Start early. Explore broadly. Build evidence over time.</h2></div>
        <div className={styles.journey}>{journey.map(([n,title,copy])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
      </section>

      <section className={`${styles.section} ${styles.experience}`}>
        <div className={styles.sectionHead}><span>Learning by doing</span><h2>Explore · Communicate · Collaborate · Create · Present · Reflect</h2><p>Workbook activities, class interaction and online practice form one connected learning experience rather than separate products.</p></div>
        <div className={styles.evidenceRow}><article><b>Practice</b><p>Repeatable language and thinking activities.</p></article><article><b>Perform</b><p>Projects, presentations and collaborative tasks.</p></article><article><b>Reflect</b><p>Student voice, self-checks and guided feedback.</p></article><article><b>Show growth</b><p>Selected learning evidence can accumulate over time.</p></article></div>
      </section>

      <section id="portals" className={`${styles.section} ${styles.portalSection}`}>
        <div className={styles.sectionHead}><span>Connected learning spaces</span><h2>One program. Focused portals for every role.</h2><p>What students do becomes useful progress for teachers and useful delivery intelligence for partner organizations.</p></div>
        <div className={styles.portalGrid}>
          <article className={styles.portalCard}><span>STUDENT PORTAL</span><h3>My Compass Workspace</h3><p>Interactive learning, lesson resources, activities, progress and learner-selected evidence.</p><ul><li>Interactive Unit 1 learning</li><li>Practice and progress sync</li><li>Reflections and achievements</li><li>Private speaking practice</li></ul><div className={styles.actions}><Link className={styles.primary} href="/auth/sign-up?callbackURL=%2Flearn%2Funit-1%3Flang%3Den">Activate student access</Link><Link className={styles.secondary} href="/learn/unit-1?lang=en">Try Unit 1</Link></div></article>
          <article className={styles.portalCard}><span>TEACHER WORKSPACE</span><h3>ClassFlow</h3><p>Classes, rosters, attendance, assignments, submissions, feedback and learning evidence.</p><ul><li>Live class roster</li><li>Attendance recording</li><li>Assignment publishing</li><li>Submission feedback</li></ul><div className={styles.actions}><Link className={styles.primary} href="/auth/sign-in?callbackURL=%2Fworkspace%2Fteacher">Open teacher workspace</Link></div></article>
          <article className={styles.portalCard}><span>PARTNER WORKSPACE</span><h3>Program Delivery</h3><p>Schools and learning centers can manage teachers, learners, classes and program delivery from one controlled workspace.</p><ul><li>Controlled partner onboarding</li><li>Create classes</li><li>Activate and assign teachers</li><li>Enroll learners</li></ul><div className={styles.actions}><Link className={styles.primary} href="/workspace/partner">Partner access</Link></div></article>
        </div>
      </section>

      <section id="centers" className={`${styles.section} ${styles.partner}`}>
        <div><span>For schools & learning centers</span><h2>Add a differentiated program — not just another English class.</h2><p>Career Compass Junior combines a classroom-ready curriculum, student books and connected digital workspaces so partners can deliver a coherent experience while keeping the learner at the center.</p></div>
        <div className={styles.partnerPoints}><article><b>Ready-to-deliver framework</b><p>Books, activities, lesson structure and digital continuation.</p></article><article><b>Stronger parent story</b><p>English learning connected to visible communication, thinking and growth.</p></article><article><b>Connected operations</b><p>Teachers, learners, classes, assignments and progress in one platform.</p></article><article><b>Built to travel</b><p>An English-first international edition designed for adaptation across ASEAN markets.</p></article></div>
      </section>

      <section className={styles.cta}>
        <div><span>Career Compass Junior · International</span><h2>Give children a better reason to learn English.</h2><p>For program partnerships, school implementation, learning-center delivery or international distribution.</p></div>
        <div className={styles.actions}><a className={styles.primary} href="mailto:Hello@vitechintelligence.com?subject=Career%20Compass%20Junior%20International%20Inquiry">Talk to ViTech →</a><Link className={styles.secondaryLight} href="/auth/sign-in">Platform sign in</Link></div>
      </section>

      <footer className={styles.footer}><div><b>Career Compass Junior</b><span>by ViTech Intelligence Solutions</span></div><div><a href="mailto:Hello@vitechintelligence.com">Hello@vitechintelligence.com</a><a href="https://vinaskilltrust.com">VinaSkillTrust.com</a><a href="https://vitechintelligence.com">ViTechIntelligence.com</a></div><small>© 2026 ViTech Intelligence. International landing edition.</small></footer>
    </main>
  );
}
