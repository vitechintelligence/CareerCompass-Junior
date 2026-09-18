import type { Metadata } from "next";
import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { SITE_URL } from "@/lib/site";
import styles from "./platform-development.module.css";

export const metadata: Metadata = {
  title: "Platform Development | ViTech Intelligence Solutions",
  description:
    "ViTech Intelligence Solutions designs and builds mobile-first web platforms, LMS products, partner portals, operational systems and AI-ready workflow applications.",
  alternates: { canonical: "/platform-development" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Platform Development | ViTech Intelligence Solutions",
    description:
      "Custom platforms from discovery and architecture through secure production deployment.",
    type: "website",
    url: SITE_URL + "/platform-development",
    siteName: "ViTech Intelligence Solutions",
  },
  twitter: {
    card: "summary",
    title: "ViTech Platform Development",
    description:
      "Mobile-first platforms, operational portals, LMS products and AI-ready workflow applications.",
  },
};

const capabilities = [
  ["01", "Learning platforms & LMS", "Interactive learning, role-based portals, course delivery, progress, assignments, feedback and evidence."],
  ["02", "Operations & admin systems", "Replace scattered spreadsheets and manual handoffs with structured workflows, permissions, dashboards and records."],
  ["03", "Client & partner portals", "Give customers, schools, vendors or distributed teams a secure workspace with the right visibility for each role."],
  ["04", "AI-ready workflow apps", "Build deterministic workflows first, then add AI where it can accelerate drafting, classification, search or decision support."],
] as const;

const platformSignals = [
  ["INTELLIGENCE", "Search, classification, assisted decisions and context-aware recommendations."],
  ["SECURITY", "Role-based access, validation, privacy boundaries and audit-friendly operations."],
  ["VISIBILITY", "Dashboards, progress, exceptions, status and actionable operational views."],
  ["CONTINUITY", "Health checks, controlled releases, resilient mobile access and safer recovery patterns."],
  ["INTEGRATION", "API-ready architecture for identity, payments, CRM, HR, messaging and external services."],
  ["WORKFLOW AUTOMATION", "Triggers, approvals, assignments, escalations and repeatable handoffs."],
  ["LOCALIZATION", "Language-aware interfaces and configurable regional or organizational rules."],
] as const;

const delivery = [
  ["Discover", "Clarify users, workflow, data, constraints and what success should look like."],
  ["Architect", "Design roles, journeys, data model, permissions, interfaces and integration boundaries."],
  ["Build", "Develop the working product across frontend, application logic, database and authentication."],
  ["Harden", "Test mobile behavior, role boundaries, security, performance, deployment and production readiness."],
  ["Evolve", "Use real usage and feedback to improve the platform without rebuilding it from scratch."],
] as const;

const proof = [
  ["3 role experiences", "Student, teacher and partner workspaces with controlled access and different operational needs."],
  ["4 interactive books", "Printed curriculum extended into digital activities and connected learner journeys."],
  ["Installable mobile experience", "Progressive web app behavior for phone-first access without requiring a separate native codebase."],
  ["Production data layer", "Neon/PostgreSQL-backed progress, classes, assignments, attendance, resources and evidence."],
  ["Security boundaries", "Role checks, internal callback validation, bounded server inputs and private-data cache controls."],
  ["Search & AI discovery", "Structured metadata, sitemap, robots rules, FAQs and llms.txt for clear public product discovery."],
] as const;

const engagement = [
  {
    name: "Pilot / MVP",
    best: "Best when you need to prove the workflow quickly.",
    items: ["Focused user journey", "Production-ready core", "Mobile-first UI", "Deployment + handoff"],
  },
  {
    name: "Custom platform build",
    best: "Best when the platform becomes part of daily operations.",
    items: ["Multi-role experience", "Database + permissions", "Dashboards and workflows", "Integrations + production hardening"],
  },
  {
    name: "Modernize / extend",
    best: "Best when you already have an app, prototype or legacy workflow.",
    items: ["Architecture review", "Replace mocks and brittle logic", "Improve UX/mobile", "Security, scale and deployment"],
  },
] as const;

const faqs = [
  ["Can ViTech build something other than an education platform?", "Yes. Career Compass Junior is the current live case study, but the same architecture patterns apply to operational portals, client workspaces, internal systems and workflow products."],
  ["Do we need a native iOS and Android app first?", "Usually not. For many business platforms, a mobile-first progressive web app gives users installable phone access while keeping one codebase. Native apps can still be added later if the use case requires them."],
  ["Can you work from an existing prototype or codebase?", "Yes. We can review an existing repository, preserve what is useful, replace mocks or fragile logic, and extend the current system rather than starting over by default."],
  ["Can AI be included?", "Yes, when it improves the workflow. We prefer to keep permissions, data rules and business logic deterministic, then use AI for tasks such as search, drafting, classification, extraction or assisted decision support."],
  ["Who owns the product after delivery?", "The intended model is a client-owned product and codebase with clear deployment and operational handoff. Any third-party services remain subject to their own accounts, plans and terms."],
  ["How do we start?", "Send the problem, current workflow, intended users and any existing files or app links. We can turn that into a scoped product brief and build plan."],
] as const;

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom Platform Development",
    serviceType: "Web application and platform development",
    provider: {
      "@type": "Organization",
      name: "ViTech Intelligence Solutions",
      url: "https://vitechintelligence.com",
      logo: SITE_URL + "/vitech-logo.svg",
      email: "business@vitechintelligence.com",
    },
    url: SITE_URL + "/platform-development",
    description:
      "Mobile-first custom platforms, LMS products, operational systems, partner portals and AI-ready workflow applications.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  },
];

export default function PlatformDevelopmentPage() {
  return (
    <main className={styles.page} id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className={styles.signalBar}>
        <span>ViTech Intelligence Solutions · Platform Development</span>
        <span>Strategy → Architecture → Build → Production</span>
      </div>

      <header className={styles.header}>
        <Link className={styles.brand} href="/platform-development" aria-label="ViTech Platform Development home">
          <VitechMark className={styles.brandMark} />
          <span><b>ViTech</b><small>Platform Development</small></span>
        </Link>
        <nav className={styles.nav} aria-label="Platform development navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#case-study">Case study</a>
          <a href="#process">Process</a>
          <a href="#engagement">Engagement</a>
          <a href="#faq">FAQs</a>
        </nav>
        <a className={styles.headerCta} href="mailto:business@vitechintelligence.com?subject=Platform%20Development%20Inquiry">
          Start a project
        </a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Custom software · built around the workflow</span>
          <h1>We build the <em>platform behind the work.</em></h1>
          <p>
            ViTech turns real operational needs into secure, mobile-first platforms — from learning systems and partner portals to internal operations and AI-ready workflow applications.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="mailto:business@vitechintelligence.com?subject=Platform%20Development%20Project%20Brief">
              Discuss your platform →
            </a>
            <a className={styles.secondary} href="#case-study">See the live case study</a>
          </div>
          <div className={styles.trustRow}>
            <span><b>Mobile-first</b><small>phone-ready by design</small></span>
            <span><b>Role-based</b><small>users see what they need</small></span>
            <span><b>Production-minded</b><small>security and deployment included</small></span>
            <span><b>AI-ready</b><small>automation without replacing core logic</small></span>
          </div>
        </div>

        <div className={styles.productPreview} aria-label="Animated preview of a ViTech training and operations platform">
          <div className={styles.previewAura} />
          <div className={styles.previewWindow}>
            <div className={styles.previewTopbar}>
              <span className={styles.windowDots}><i /><i /><i /></span>
              <b>ViTech Training + Operations</b>
              <span className={styles.liveBadge}>LIVE PREVIEW</span>
            </div>

            <div className={styles.previewBody}>
              <aside className={styles.previewSidebar}>
                <VitechMark className={styles.previewLogo} size={34} />
                <span className={styles.sideActive}>⌂</span>
                <span>◎</span>
                <span>↻</span>
                <span>◫</span>
                <span>⚙</span>
              </aside>

              <div className={styles.previewCanvas}>
                <div className={styles.previewHeading}>
                  <div><small>Operations Command Center</small><b>Training, delivery & workflow in one view</b></div>
                  <span>EN <i /> VI</span>
                </div>

                <div className={styles.previewMetrics}>
                  <article><small>Training</small><b>24</b><span>active journeys</span></article>
                  <article><small>Operations</small><b>8</b><span>work queues</span></article>
                  <article><small>Automation</small><b>12</b><span>workflow rules</span></article>
                </div>

                <div className={styles.previewGrid}>
                  <section className={styles.workflowCard}>
                    <div className={styles.cardTitle}><b>Workflow automation</b><span>RUNNING</span></div>
                    <div className={styles.flowLine}>
                      <div><i>1</i><span>Onboard</span></div>
                      <em />
                      <div><i>2</i><span>Train</span></div>
                      <em />
                      <div><i>3</i><span>Validate</span></div>
                      <em />
                      <div><i>4</i><span>Deploy</span></div>
                    </div>
                    <div className={styles.automationRows}>
                      <span><i /> New learner → assign journey <b>AUTO</b></span>
                      <span><i /> Missed checkpoint → notify owner <b>RULE</b></span>
                      <span><i /> Completion → create evidence <b>SYNC</b></span>
                    </div>
                  </section>

                  <section className={styles.intelligenceCard}>
                    <div className={styles.cardTitle}><b>Intelligence layer</b><span className={styles.aiPulse}>AI</span></div>
                    <div className={styles.insightHero}><strong>3 signals need attention</strong><small>Summarized across training + operations</small></div>
                    <div className={styles.insightBars}><i /><i /><i /><i /></div>
                    <p>Search · classify · summarize · recommend</p>
                  </section>

                  <section className={styles.visibilityCard}>
                    <div className={styles.cardTitle}><b>Visibility</b><span>REAL-TIME VIEW</span></div>
                    <div className={styles.miniChart}><i /><i /><i /><i /><i /><i /></div>
                    <div className={styles.statusRow}><span>Delivery</span><b>Healthy</b></div>
                    <div className={styles.statusRow}><span>Exceptions</span><b>2 open</b></div>
                  </section>

                  <section className={styles.securityCard}>
                    <div className={styles.cardTitle}><b>Security + continuity</b><span>PROTECTED</span></div>
                    <div className={styles.securityRing}><span>✓</span></div>
                    <ul><li>Role-based access</li><li>Private data boundaries</li><li>Health checks + controlled releases</li></ul>
                  </section>
                </div>

                <div className={styles.integrationBar}>
                  <b>Integration-ready</b>
                  <span>API</span><span>SSO</span><span>CRM</span><span>HR</span><span>PAY</span><span>MSG</span>
                  <em>Localized · EN / VI / regional rules</em>
                </div>
              </div>
            </div>
          </div>

          <span className={styles.floatChip + " " + styles.floatA}>Workflow automation</span>
          <span className={styles.floatChip + " " + styles.floatB}>Security</span>
          <span className={styles.floatChip + " " + styles.floatC}>Integrations</span>
          <span className={styles.floatChip + " " + styles.floatD}>Localization</span>
        </div>
      </section>

      <section className={styles.capabilitySection} id="capabilities">
        <div className={styles.sectionHead}>
          <span>What we build</span>
          <h2>Not just pages. Connected systems.</h2>
          <p>A good platform should connect the user experience, business workflow, permissions, data and production environment as one product.</p>
        </div>
        <div className={styles.capabilityGrid}>
          {capabilities.map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>

        <div className={styles.signalShowcase}>
          <div className={styles.signalIntro}>
            <span>Platform proof patterns</span>
            <h3>Build the capability into the product — not into a slide deck.</h3>
            <p>These are the platform patterns we design around so training and operations stay connected, observable and adaptable as the organization grows.</p>
          </div>
          <div className={styles.signalGrid}>
            {platformSignals.map(([title, copy], index) => (
              <article key={title}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div><span>{title}</span><p>{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.caseStudy} id="case-study">
        <div className={styles.caseCopy}>
          <span>Live case study</span>
          <h2>Career Compass Junior: from books to a connected learning platform.</h2>
          <p>
            Career Compass Junior demonstrates the full-stack pattern: public discovery, interactive content, role-based LMS workspaces, a production database, installable mobile access and controlled operations for schools and learning centers.
          </p>
          <div className={styles.caseActions}>
            <Link className={styles.primaryLight} href="/international">Open Career Compass Junior →</Link>
            <Link className={styles.caseLink} href="/portal/partner">Preview the partner portal</Link>
          </div>
        </div>

        <div className={styles.proofGrid}>
          {proof.map(([title, copy]) => (
            <article key={title}><b>{title}</b><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section className={styles.architecture}>
        <div className={styles.sectionHead}>
          <span>How the product connects</span>
          <h2>Back end, application logic and front end designed together.</h2>
        </div>
        <div className={styles.archGrid}>
          <article><span>FRONT</span><h3>Experience layer</h3><p>Responsive interfaces, dashboards, forms, learning experiences, client portals and installable mobile behavior.</p></article>
          <article><span>MID</span><h3>Application layer</h3><p>Role rules, workflow states, server actions, validation, integrations, automation and business logic.</p></article>
          <article><span>BACK</span><h3>Data & identity layer</h3><p>Authentication, relational data models, permissions, evidence, operational records and production-safe data flows.</p></article>
          <article><span>OPS</span><h3>Production layer</h3><p>Deployment, environment configuration, security headers, health checks, observability and scalable release practices.</p></article>
        </div>
      </section>

      <section className={styles.processSection} id="process">
        <div className={styles.sectionHead}>
          <span>Delivery process</span>
          <h2>Build enough structure to move fast without creating a mess later.</h2>
        </div>
        <div className={styles.timeline}>
          {delivery.map(([title, copy], index) => (
            <article key={title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div><h3>{title}</h3><p>{copy}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.engagementSection} id="engagement">
        <div className={styles.sectionHead}>
          <span>Ways to engage</span>
          <h2>Start where the product actually is.</h2>
          <p>We can begin with a focused pilot, build a platform from the ground up, or take over an existing prototype and harden it into a real product.</p>
        </div>
        <div className={styles.engagementGrid}>
          {engagement.map((item) => (
            <article key={item.name}>
              <span>{item.name}</span>
              <p>{item.best}</p>
              <ul>{item.items.map((point) => <li key={point}>{point}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.briefSection}>
        <div>
          <span>Project brief</span>
          <h2>You do not need a technical specification to start.</h2>
          <p>
            Tell us what people do today, what is painful, who needs access and what should become easier. We can translate that into the product structure.
          </p>
        </div>
        <div className={styles.briefCards}>
          <span><b>1</b>Who will use it?</span>
          <span><b>2</b>What do they need to do?</span>
          <span><b>3</b>What data or tools already exist?</span>
          <span><b>4</b>What would make the project successful?</span>
        </div>
        <a className={styles.primary} href="mailto:business@vitechintelligence.com?subject=ViTech%20Platform%20Development%20Brief&body=Project%20or%20business%3A%0AUsers%3A%0ACurrent%20workflow%3A%0AMain%20problem%3A%0AWhat%20the%20platform%20should%20help%20users%20do%3A%0AExisting%20app%2Ffiles%2Flinks%3A">
          Email a project brief →
        </a>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.sectionHead}>
          <span>Frequently asked questions</span>
          <h2>What clients usually want to know first.</h2>
        </div>
        <div className={styles.faqGrid}>
          {faqs.map(([question, answer]) => (
            <details key={question}><summary>{question}</summary><p>{answer}</p></details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span>ViTech Platform Development</span>
          <h2>Bring the workflow. We’ll help turn it into a product.</h2>
          <p>Custom platform design and development for organizations that need more than a template website.</p>
        </div>
        <div>
          <a className={styles.primaryLight} href="mailto:business@vitechintelligence.com?subject=Platform%20Development%20Inquiry">business@vitechintelligence.com</a>
          <Link className={styles.secondaryDark} href="/international">View Career Compass Junior</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><VitechMark className={styles.footerLogo} /><span><b>ViTech Intelligence Solutions</b><small>Smarter Skills. Stronger Teams.</small></span></div>
        <div><a href="https://vitechintelligence.com">ViTechIntelligence.com</a><a href="mailto:business@vitechintelligence.com">Business inquiries</a><a href="#top">Back to top ↑</a></div>
        <small>© 2026 ViTech Intelligence Solutions. Platform development capability page.</small>
      </footer>
    </main>
  );
}
