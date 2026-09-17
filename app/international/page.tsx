import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import path from "node:path";
import styles from "./international.module.css";

export const metadata: Metadata = {
  title: "Career Compass Junior | English, Life Skills & Future Readiness",
  description:
    "Career Compass Junior is a connected bilingual learning collection for ages 4–18, combining English communication, human skills, life skills and future discovery.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Career Compass Junior | English, Life Skills & Future Readiness",
    description:
      "Books, learning portals and partner-ready program delivery from ViTech Intelligence Solutions.",
    type: "website",
  },
};

function embeddedBookCover(index: number) {
  try {
    const html = readFileSync(path.join(process.cwd(), "public", "landing.html"), "utf8");
    const match = html.match(new RegExp(`--bk${index}:url\\(\"([^\"]+)\"\\)`));
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

const covers = [1, 2, 3, 4].map(embeddedBookCover);

const books = [
  {
    tag: "KIDS 7–12",
    title: "Career Compass Junior",
    subtitle: "Big Ideas, Bright Futures",
    copy: "An English + skills adventure for curious minds, with communication, reasoning, creation and reflection at the center.",
    detail: "English · CEFR B1+ · 40-page student journey",
    cover: covers[0],
  },
  {
    tag: "BILINGUAL · 96 LESSONS",
    title: "Career Compass Junior",
    subtitle: "Mastery · Beginner",
    copy: "Bilingual English–Vietnamese support for ages 7–12, designed to help beginners start with confidence and grow into useful communication.",
    detail: "Ages 7–12 · CEFR A0–A1 → early A2",
    cover: covers[1],
  },
  {
    tag: "TEENS 13–18",
    title: "MY COMPASS",
    subtitle: "English + Life Skills + Career Discovery",
    copy: "A Vietnamese-first teen pathway that grows English alongside self-awareness, life skills and future exploration.",
    detail: "Ages 13–18 · CEFR A0–A1",
    cover: covers[2],
  },
  {
    tag: "AGES 4–6",
    title: "EERS Action City",
    subtitle: "My First Sound Adventures",
    copy: "Listen, move, trace and play through early English sounds, pencil play and action-based language discovery.",
    detail: "Early English Reflex System · ages 4–6",
    cover: covers[3],
  },
] as const;

const skills = [
  ["Communication", "Express ideas clearly, listen actively and use English for real interaction."],
  ["Reasoning", "Explain choices, compare options and build confidence in thinking aloud."],
  ["Social growth", "Collaborate, take turns, understand others and contribute to a group."],
  ["Self-development", "Reflect on strengths, interests, habits and personal progress."],
  ["Creativity", "Build, imagine, present and improve ideas through guided projects."],
  ["Future readiness", "Connect school learning with roles, possibilities and changing work."],
] as const;

const journey = [
  ["01", "Who am I?", "Strengths, voice, confidence and self-awareness."],
  ["02", "What interests me?", "Curiosity, subjects, activities and emerging preferences."],
  ["03", "What can I do?", "Skills demonstrated through communication, projects and practice."],
  ["04", "Where might I fit?", "Age-appropriate exposure to roles, environments and possibilities."],
  ["05", "What is my next step?", "Reflection, reasoning and choices with better information."],
] as const;

const partnerBenefits = [
  ["Differentiate your center", "Offer families something beyond another test-preparation or textbook-only option."],
  ["Ready-to-deliver framework", "Program structure, activities, workbooks and assessment are connected from the start."],
  ["Stronger parent story", "Make communication, confidence, skills and emerging interests visible — not only scores."],
  ["Longer learner journey", "Grow with learners from early English discovery through later life and career exploration."],
  ["Connected delivery", "Keep resources, attendance, progress and communication tied to the program."],
  ["Transferable capability", "Practice reasoning and communication that can travel beyond the English classroom."],
] as const;

function CoverImage({ src, alt }: { src: string; alt: string }) {
  if (!src) return <span className={styles.coverFallback}>{alt}</span>;
  return (
    // The source HTML already contains the approved embedded book artwork.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  );
}

export default function InternationalLanding() {
  return (
    <main className={styles.page}>
      <div className={styles.progressTrack} aria-hidden="true"><span /></div>

      <div className={styles.launchStrip}>
        <span>Career Compass Junior · International Learning Collection</span>
        <span>English · Life Skills · Future Readiness · Ages 4–18</span>
      </div>

      <header className={styles.header}>
        <Link href="/international" className={styles.brand} aria-label="Career Compass Junior home">
          <span className={styles.brandMark}>CC</span>
          <span><b>Career Compass Junior</b><small>by ViTech Intelligence Solutions</small></span>
        </Link>
        <nav className={styles.nav} aria-label="International landing navigation">
          <a href="#books">Books</a>
          <a href="#difference">Approach</a>
          <a href="#journey">Journey</a>
          <a href="#portals">Portals</a>
          <a href="#centers">For partners</a>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.language} href="/vn">VI</Link>
          <span className={styles.languageActive}>EN</span>
          <Link className={styles.signIn} href="/auth/sign-in">Sign in</Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Bilingual learning ecosystem · ages 4–18</span>
          <h1>Use English to <em>build a bigger world.</em></h1>
          <div className={styles.wordRail} aria-label="Career Compass learning actions">
            <span>COMMUNICATE</span><span>THINK</span><span>CREATE</span><span>DISCOVER</span>
          </div>
          <p>Career Compass Junior connects English communication with human skills, reflection, projects and future readiness — from early learners to teens.</p>
          <div className={styles.note}><b>Not only learning English.</b> Children use English to explore themselves, develop skills, and find direction for the future.</div>
          <div className={styles.actions}>
            <a className={styles.primary} href="#books">Explore the 4 books →</a>
            <a className={styles.secondary} href="#portals">Preview learning spaces</a>
          </div>
          <div className={styles.heroMetrics}>
            <span><b>4</b><small>program titles</small></span>
            <span><b>96</b><small>beginner lessons</small></span>
            <span><b>3</b><small>connected portals</small></span>
            <span><b>4–18</b><small>learner ages</small></span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Career Compass Junior book collection">
          <div className={styles.bookHalo} aria-hidden="true" />
          {books.map((book, index) => (
            <div className={`${styles.heroBook} ${styles[`heroBook${index + 1}`]}`} key={book.subtitle}>
              <CoverImage src={book.cover} alt={`${book.title} — ${book.subtitle}, by Zxynn Khang`} />
            </div>
          ))}
          <div className={styles.heroBadge}><b>4</b><span>Program titles<small>Ages 4–18 · connected learning</small></span></div>
        </div>
      </section>

      <section id="books" className={styles.section}>
        <div className={styles.splitHead}>
          <div><span>The learning collection</span><h2>Four books. One connected journey.</h2></div>
          <p>From sound-and-action discovery to confident communication, life skills and career exploration — every title has a clear age, level and learning role.</p>
        </div>
        <div className={styles.bookGrid}>
          {books.map((book, index) => (
            <article className={styles.book} key={book.subtitle}>
              <div className={`${styles.bookCover} ${styles[`cover${index + 1}`]}`}>
                <CoverImage src={book.cover} alt={`${book.title} — ${book.subtitle}`} />
                <span className={styles.bookShine} aria-hidden="true" />
              </div>
              <span className={styles.bookTag}>{book.tag}</span>
              <h3>{book.title}</h3>
              <h4>{book.subtitle}</h4>
              <p>{book.copy}</p>
              <small>{book.detail}</small>
              <b className={styles.author}>By Zxynn Khang</b>
            </article>
          ))}
        </div>
        <div className={styles.motionHint}><b>Interactive collection</b><span>Hover or focus a book to lift, tilt and reveal a subtle light sweep. On touch devices, the collection becomes a smooth visual browsing experience.</span></div>
      </section>

      <section id="difference" className={`${styles.section} ${styles.tint}`}>
        <div className={styles.sectionHead}>
          <span>Why Career Compass feels different</span>
          <h2>English is the medium. Growing capability is the destination.</h2>
          <p>Language still matters. The difference is what learners do with it: communicate with purpose, explain choices, collaborate, create and reflect.</p>
        </div>
        <blockquote className={styles.quote}><em>“Not only learning English.</em> Children use English to explore themselves, develop skills, and find direction for the future.”</blockquote>
        <div className={styles.compareGrid}>
          <article className={styles.compareOld}>
            <span>LANGUAGE-FIRST MODEL</span>
            <h3>Practice the language target.</h3>
            <ul><li>Vocabulary and grammar targets</li><li>Memorization and repetition</li><li>Test / exam preparation</li><li>Speaking mainly inside the English lesson</li></ul>
          </article>
          <article className={styles.compareNew}>
            <span>CAREER COMPASS APPROACH</span>
            <h3>Use language to do something meaningful.</h3>
            <ul><li>Communication with a real purpose</li><li>Reasoning, collaboration and reflection</li><li>Projects, creation and learner evidence</li><li>Skills designed to transfer beyond English class</li></ul>
          </article>
        </div>
        <div className={styles.skillGrid}>
          {skills.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section id="journey" className={styles.section}>
        <div className={styles.sectionHead}><span>Long-term development journey</span><h2>Start early. Explore broadly. Build evidence over time.</h2><p>The program can grow with a learner instead of resetting the story every term.</p></div>
        <div className={styles.journey}>{journey.map(([number, title, copy]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
      </section>

      <section className={`${styles.section} ${styles.mediaShowcase}`}>
        <div className={styles.mediaCopy}>
          <span>Program showcase</span>
          <h2>See the learning experience before the first class.</h2>
          <p>Book previews, lesson snapshots and portal demonstrations make the program tangible for parents, learners and implementation partners.</p>
        </div>
        <div className={styles.previewGrid}>
          <article><span>AGES 4–6</span><h3>Hear it · move it · say it</h3><div className={styles.previewStage}><i /><i /><i /></div><b>EARLY LEARNING PREVIEW →</b></article>
          <article><span>AGES 7–12</span><h3>Communicate · reason · build</h3><div className={styles.previewStage}><i /><i /><i /></div><b>LESSON PREVIEW →</b></article>
          <article><span>AGES 13–18</span><h3>Reflect · explore · choose</h3><div className={styles.previewStage}><i /><i /><i /></div><b>WORKBOOK PREVIEW →</b></article>
          <article><span>SCHOOLS & CENTERS</span><h3>Teach · track · share</h3><div className={styles.previewStage}><i /><i /><i /></div><b>PORTAL PREVIEW →</b></article>
        </div>
      </section>

      <section id="portals" className={`${styles.section} ${styles.portalSection}`}>
        <div className={styles.sectionHead}><span>Connected learning spaces</span><h2>One program. Three focused portals.</h2><p>Students get a personal learning space, teachers get a practical class-management hub, and partner organizations get controlled program visibility.</p></div>
        <div className={styles.portalGrid}>
          <article className={styles.portalCard}>
            <div className={`${styles.portalMock} ${styles.studentMock}`}><div className={styles.mockHead}><b>My Compass</b><span>AN</span></div><div className={styles.mockHero}>Ready to make your idea clearer?</div><div className={styles.mockRows}><i /><i /><i /></div></div>
            <span>STUDENT PORTAL</span><h3>My Compass Learner Space</h3><p>Interactive learning, resources, progress, reflection and learner evidence.</p><ul><li>Continue learning</li><li>See progress</li><li>Build learning evidence</li></ul>
            <div className={styles.actions}><Link className={styles.primary} href="/auth/sign-up?callbackURL=%2Fportal%2Fstudent">Activate student access</Link><Link className={styles.secondary} href="/learn/unit-1?lang=en">Try Unit 1</Link></div>
          </article>
          <article className={styles.portalCard}>
            <div className={`${styles.portalMock} ${styles.teacherMock}`}><div className={styles.mockHead}><b>ClassFlow</b><span>TC</span></div><div className={styles.mockStats}><b>2<small>classes</small></b><b>94%<small>attendance</small></b><b>3<small>feedback due</small></b></div><div className={styles.mockRows}><i /><i /><i /></div></div>
            <span>TEACHER PORTAL</span><h3>ClassFlow Teacher Hub</h3><p>A lightweight command center for classes, attendance, assignments, feedback and parent updates.</p><ul><li>Class & roster essentials</li><li>Attendance & feedback</li><li>Progress & grading</li></ul>
            <div className={styles.actions}><Link className={styles.primary} href="/auth/sign-in?callbackURL=%2Fworkspace%2Fteacher">Open teacher workspace</Link></div>
          </article>
          <article className={styles.portalCard}>
            <div className={`${styles.portalMock} ${styles.partnerMock}`}><div className={styles.mockHead}><b>Partner Hub</b><span>PA</span></div><div className={styles.mockStats}><b>4<small>classes</small></b><b>8<small>teachers</small></b><b>72<small>learners</small></b></div><div className={styles.mockRows}><i /><i /><i /></div></div>
            <span>PARTNER PORTAL</span><h3>Program Operations Hub</h3><p>Schools and centers can coordinate teachers, learners, classes and delivery from one controlled workspace.</p><ul><li>Partner onboarding</li><li>Teacher & student overview</li><li>Resources & delivery status</li></ul>
            <div className={styles.actions}><Link className={styles.primary} href="/workspace/partner">Partner access</Link></div>
          </article>
        </div>
      </section>

      <section id="centers" className={`${styles.section} ${styles.partner}`}>
        <div className={styles.partnerIntro}><span>For schools & learning centers</span><h2>More than another English course.</h2><p>Give families a clearer story: useful English communication, visible human-skill growth, connected learning spaces and a longer learner journey.</p><Link className={styles.primary} href="/workspace/partner">Explore partnership →</Link></div>
        <div className={styles.partnerPoints}>{partnerBenefits.map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><b>{title}</b><p>{copy}</p></article>)}</div>
      </section>

      <section className={styles.helpdesk}>
        <div className={styles.helpCopy}><span>Concierge helpdesk</span><h2>Need class setup, portal access, roster help, parent materials or partnership guidance?</h2><p>Choose the fastest path for your question. We can support families, teachers, schools and training centers from inquiry through implementation.</p><div className={styles.actions}><a className={styles.primary} href="https://zalo.me/84967243150" target="_blank" rel="noreferrer">Zalo Mr. Chung</a><a className={styles.secondary} href="mailto:Hello@vitechintelligence.com?subject=Career%20Compass%20Junior%20Helpdesk">Email helpdesk</a><a className={styles.secondary} href="mailto:business@vitechintelligence.com?subject=Career%20Compass%20Junior%20Partnership">Partnership inquiry</a></div></div>
        <div className={styles.helpOrb}><span>CHAT</span><b>Zalo · Email</b><small>Partnership</small></div>
      </section>

      <section className={styles.cta}>
        <div><span>Career Compass Junior · International</span><h2>Give learners a better reason to use English.</h2><p>For program partnerships, school implementation, learning-center delivery or international distribution.</p></div>
        <div className={styles.actions}><a className={styles.primary} href="mailto:business@vitechintelligence.com?subject=Career%20Compass%20Junior%20International%20Inquiry">Talk to ViTech →</a><Link className={styles.secondaryLight} href="/auth/sign-in">Platform sign in</Link></div>
      </section>

      <details className={styles.contactWidget}>
        <summary aria-label="Open contact options"><span className={styles.contactPulse} />Need help?</summary>
        <div><b>How can we help?</b><a href="https://zalo.me/84967243150" target="_blank" rel="noreferrer">Zalo · fast reply</a><a href="mailto:Hello@vitechintelligence.com">Student / teacher support</a><a href="mailto:business@vitechintelligence.com">School / center partnership</a><a href="#top">Back to top ↑</a></div>
      </details>

      <footer className={styles.footer}><div><b>Career Compass Junior</b><span>by ViTech Intelligence Solutions</span></div><div><a href="mailto:Hello@vitechintelligence.com">Hello@vitechintelligence.com</a><a href="https://vinaskilltrust.com">VinaSkillTrust.com</a><a href="https://vitechintelligence.com">ViTechIntelligence.com</a></div><small>© 2026 ViTech Intelligence Solutions. International learning edition.</small></footer>
    </main>
  );
}
