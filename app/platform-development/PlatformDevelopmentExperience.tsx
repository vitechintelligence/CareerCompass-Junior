import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import { SITE_URL } from "@/lib/site";
import styles from "./platform-development.module.css";

export type PlatformLocale = "en" | "vi";

export default function PlatformDevelopmentExperience({ locale }: { locale: PlatformLocale }) {
  const vi = locale === "vi";
  const t = (en: string, viText: string) => (vi ? viText : en);

  const capabilities = vi
    ? [
        ["01", "Nền tảng học tập & LMS", "Học tương tác, cổng theo vai trò, phân phối khóa học, tiến độ, bài tập, phản hồi và minh chứng học tập."],
        ["02", "Hệ thống vận hành & quản trị", "Thay thế bảng tính rời rạc và bàn giao thủ công bằng quy trình có cấu trúc, phân quyền, bảng điều khiển và hồ sơ vận hành."],
        ["03", "Cổng khách hàng & đối tác", "Cung cấp không gian làm việc bảo mật cho khách hàng, trường học, nhà cung cấp hoặc đội ngũ phân tán với quyền xem phù hợp từng vai trò."],
        ["04", "Ứng dụng quy trình sẵn sàng cho AI", "Xây logic quy trình rõ ràng trước, sau đó bổ sung AI cho tìm kiếm, soạn thảo, phân loại, tóm tắt và hỗ trợ quyết định."],
      ] as const
    : [
        ["01", "Learning platforms & LMS", "Interactive learning, role-based portals, course delivery, progress, assignments, feedback and evidence."],
        ["02", "Operations & admin systems", "Replace scattered spreadsheets and manual handoffs with structured workflows, permissions, dashboards and records."],
        ["03", "Client & partner portals", "Give customers, schools, vendors or distributed teams a secure workspace with the right visibility for each role."],
        ["04", "AI-ready workflow apps", "Build deterministic workflows first, then add AI where it can accelerate drafting, classification, search or decision support."],
      ] as const;

  const platformSignals = vi
    ? [
        ["TRÍ TUỆ", "Tìm kiếm, phân loại, hỗ trợ quyết định và gợi ý dựa trên ngữ cảnh."],
        ["BẢO MẬT", "Phân quyền theo vai trò, kiểm tra dữ liệu đầu vào, ranh giới riêng tư và vận hành thuận lợi cho kiểm toán."],
        ["KHẢ NĂNG QUAN SÁT", "Bảng điều khiển, tiến độ, ngoại lệ, trạng thái và góc nhìn hành động được."],
        ["TÍNH LIÊN TỤC", "Health check, phát hành có kiểm soát, truy cập di động bền vững và phương án khôi phục an toàn hơn."],
        ["TÍCH HỢP", "Kiến trúc sẵn sàng API cho danh tính, thanh toán, CRM, HR, nhắn tin và dịch vụ bên ngoài."],
        ["TỰ ĐỘNG HÓA QUY TRÌNH", "Kích hoạt, phê duyệt, phân công, leo thang và bàn giao lặp lại một cách nhất quán."],
        ["BẢN ĐỊA HÓA", "Giao diện theo ngôn ngữ và quy tắc có thể cấu hình theo khu vực hoặc tổ chức."],
      ] as const
    : [
        ["INTELLIGENCE", "Search, classification, assisted decisions and context-aware recommendations."],
        ["SECURITY", "Role-based access, validation, privacy boundaries and audit-friendly operations."],
        ["VISIBILITY", "Dashboards, progress, exceptions, status and actionable operational views."],
        ["CONTINUITY", "Health checks, controlled releases, resilient mobile access and safer recovery patterns."],
        ["INTEGRATION", "API-ready architecture for identity, payments, CRM, HR, messaging and external services."],
        ["WORKFLOW AUTOMATION", "Triggers, approvals, assignments, escalations and repeatable handoffs."],
        ["LOCALIZATION", "Language-aware interfaces and configurable regional or organizational rules."],
      ] as const;

  const delivery = vi
    ? [
        ["Khám phá", "Làm rõ người dùng, quy trình hiện tại, dữ liệu, ràng buộc và tiêu chí thành công."],
        ["Kiến trúc", "Thiết kế vai trò, hành trình, mô hình dữ liệu, quyền truy cập, giao diện và ranh giới tích hợp."],
        ["Xây dựng", "Phát triển sản phẩm thật từ giao diện, logic ứng dụng, cơ sở dữ liệu đến xác thực."],
        ["Gia cố", "Kiểm thử trải nghiệm di động, ranh giới vai trò, bảo mật, hiệu năng, triển khai và mức sẵn sàng sản xuất."],
        ["Tiến hóa", "Dùng dữ liệu sử dụng và phản hồi thật để cải thiện sản phẩm mà không phải xây lại từ đầu."],
      ] as const
    : [
        ["Discover", "Clarify users, workflow, data, constraints and what success should look like."],
        ["Architect", "Design roles, journeys, data model, permissions, interfaces and integration boundaries."],
        ["Build", "Develop the working product across frontend, application logic, database and authentication."],
        ["Harden", "Test mobile behavior, role boundaries, security, performance, deployment and production readiness."],
        ["Evolve", "Use real usage and feedback to improve the platform without rebuilding it from scratch."],
      ] as const;

  const proof = vi
    ? [
        ["3 trải nghiệm theo vai trò", "Không gian cho học sinh, giáo viên và đối tác với quyền truy cập và nhu cầu vận hành khác nhau."],
        ["4 lộ trình sách tương tác", "Mở rộng nội dung sách in sang hoạt động số và hành trình học tập kết nối trong khi quá trình chuyển đổi toàn bộ sách vẫn tiếp tục."],
        ["Trải nghiệm cài được trên điện thoại", "PWA ưu tiên di động để người dùng truy cập như ứng dụng mà không cần duy trì mã nguồn native riêng."],
        ["Lớp dữ liệu sản xuất", "Neon/PostgreSQL cho tiến độ, lớp học, bài tập, điểm danh, tài nguyên và minh chứng."],
        ["Ranh giới bảo mật", "Kiểm tra vai trò, callback nội bộ, giới hạn đầu vào phía server và kiểm soát cache dữ liệu riêng tư."],
        ["Khả năng được AI & công cụ tìm kiếm hiểu", "Metadata có cấu trúc, sitemap, robots, FAQ và llms.txt cho khả năng khám phá rõ ràng hơn."],
      ] as const
    : [
        ["3 role experiences", "Student, teacher and partner workspaces with controlled access and different operational needs."],
        ["4 interactive book pathways", "Printed curriculum extended into digital activities and connected learner journeys while full-book conversion continues."],
        ["Installable mobile experience", "Progressive web app behavior for phone-first access without requiring a separate native codebase."],
        ["Production data layer", "Neon/PostgreSQL-backed progress, classes, assignments, attendance, resources and evidence."],
        ["Security boundaries", "Role checks, internal callback validation, bounded server inputs and private-data cache controls."],
        ["Search & AI discovery", "Structured metadata, sitemap, robots rules, FAQs and llms.txt for clear public product discovery."],
      ] as const;

  const engagement = vi
    ? [
        { name: "Pilot / MVP", best: "Phù hợp khi cần chứng minh quy trình nhanh và có sản phẩm thật để thử.", items: ["Một hành trình người dùng trọng tâm", "Lõi đủ dùng ở môi trường thật", "UI ưu tiên di động", "Triển khai + bàn giao"] },
        { name: "Xây nền tảng tùy chỉnh", best: "Phù hợp khi nền tảng trở thành một phần của vận hành hằng ngày.", items: ["Trải nghiệm đa vai trò", "Cơ sở dữ liệu + phân quyền", "Dashboard và workflow", "Tích hợp + gia cố sản xuất"] },
        { name: "Hiện đại hóa / mở rộng", best: "Phù hợp khi đã có app, prototype hoặc quy trình cũ cần nâng cấp.", items: ["Rà soát kiến trúc", "Thay mock và logic mong manh", "Cải thiện UX/mobile", "Bảo mật, khả năng mở rộng và triển khai"] },
      ]
    : [
        { name: "Pilot / MVP", best: "Best when you need to prove the workflow quickly.", items: ["Focused user journey", "Production-ready core", "Mobile-first UI", "Deployment + handoff"] },
        { name: "Custom platform build", best: "Best when the platform becomes part of daily operations.", items: ["Multi-role experience", "Database + permissions", "Dashboards and workflows", "Integrations + production hardening"] },
        { name: "Modernize / extend", best: "Best when you already have an app, prototype or legacy workflow.", items: ["Architecture review", "Replace mocks and brittle logic", "Improve UX/mobile", "Security, scale and deployment"] },
      ];

  const faqs = vi
    ? [
        ["ViTech có thể xây nền tảng ngoài lĩnh vực giáo dục không?", "Có. Career Compass Junior là case study đang hoạt động, nhưng cùng kiểu kiến trúc có thể áp dụng cho cổng vận hành, không gian khách hàng, hệ thống nội bộ và sản phẩm theo quy trình."],
        ["Có cần làm app native iOS và Android ngay từ đầu không?", "Thường là chưa cần. Với nhiều nền tảng doanh nghiệp, PWA ưu tiên di động cho phép cài lên màn hình chính và dùng như ứng dụng trong khi vẫn duy trì một codebase. Native có thể bổ sung sau nếu use case thực sự cần."],
        ["ViTech có thể tiếp quản prototype hoặc codebase đang có không?", "Có. Chúng tôi có thể rà soát repo hiện tại, giữ phần tốt, thay mock hoặc logic dễ vỡ và mở rộng hệ thống thay vì mặc định xây lại từ đầu."],
        ["Có thể tích hợp AI không?", "Có, khi AI thực sự giúp quy trình. Chúng tôi giữ phân quyền, quy tắc dữ liệu và logic nghiệp vụ ở dạng xác định trước; sau đó dùng AI cho tìm kiếm, soạn thảo, phân loại, trích xuất hoặc hỗ trợ quyết định."],
        ["Sau khi bàn giao thì sản phẩm thuộc về ai?", "Mô hình hướng đến sản phẩm và codebase do khách hàng sở hữu, kèm bàn giao triển khai và vận hành rõ ràng. Các dịch vụ bên thứ ba vẫn theo tài khoản, gói và điều khoản riêng của nhà cung cấp."],
        ["Bắt đầu dự án như thế nào?", "Chỉ cần gửi vấn đề, quy trình hiện tại, nhóm người dùng và các file/app/link đang có. Chúng tôi có thể chuyển chúng thành phạm vi sản phẩm và kế hoạch xây dựng."],
      ] as const
    : [
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
      name: t("Custom Platform Development", "Phát triển nền tảng tùy chỉnh"),
      serviceType: t("Web application and platform development", "Phát triển ứng dụng web và nền tảng"),
      inLanguage: locale,
      provider: {
        "@type": "Organization",
        name: "ViTech Intelligence Solutions",
        url: "https://vitechintelligence.com",
        logo: SITE_URL + "/vitech-logo.svg",
        email: "business@vitechintelligence.com",
      },
      url: SITE_URL + (vi ? "/vn/platform-development" : "/platform-development"),
      description: t(
        "Mobile-first custom platforms, LMS products, operational systems, partner portals and AI-ready workflow applications.",
        "Nền tảng tùy chỉnh ưu tiên di động, LMS, hệ thống vận hành, cổng đối tác và ứng dụng workflow sẵn sàng cho AI."
      ),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];

  return (
    <main className={styles.page} id="top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className={styles.signalBar}>
        <span>{t("ViTech Intelligence Solutions · Platform Development", "ViTech Intelligence Solutions · Phát triển nền tảng")}</span>
        <span>{t("Strategy → Architecture → Build → Production", "Chiến lược → Kiến trúc → Xây dựng → Vận hành")}</span>
      </div>

      <header className={styles.header}>
        <Link className={styles.brand} href={vi ? "/vn/platform-development" : "/platform-development"} aria-label={t("ViTech Platform Development home", "Trang Phát triển nền tảng ViTech")}>
          <VitechMark className={styles.brandMark} />
          <span><b>ViTech</b><small>{t("Platform Development", "Phát triển nền tảng")}</small></span>
        </Link>
        <nav className={styles.nav} aria-label={t("Platform development navigation", "Điều hướng phát triển nền tảng")}>
          <a href="#capabilities">{t("Capabilities", "Năng lực")}</a>
          <a href="#case-study">{t("Case study", "Case study")}</a>
          <a href="#process">{t("Process", "Quy trình")}</a>
          <a href="#engagement">{t("Engagement", "Hợp tác")}</a>
          <a href="#faq">FAQs</a>
        </nav>
        <div className={styles.localeSwitch} aria-label={t("Language", "Ngôn ngữ")}>
          <Link className={!vi ? styles.localeActive : ""} href="/platform-development">EN</Link>
          <Link className={vi ? styles.localeActive : ""} href="/vn/platform-development">VI</Link>
        </div>
        <a className={styles.headerCta} href="mailto:business@vitechintelligence.com?subject=Platform%20Development%20Inquiry">
          {t("Start a project", "Bắt đầu dự án")}
        </a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{t("Custom software · built around the workflow", "Phần mềm tùy chỉnh · xây theo quy trình thực tế")}</span>
          <h1>{t("We build the ", "Chúng tôi xây ")}<em>{t("platform behind the work.", "nền tảng để công việc vận hành tốt hơn.")}</em></h1>
          <p>{t(
            "ViTech turns real operational needs into secure, mobile-first platforms — from learning systems and partner portals to internal operations and AI-ready workflow applications.",
            "ViTech biến nhu cầu vận hành thực tế thành các nền tảng bảo mật, ưu tiên di động — từ hệ thống học tập và cổng đối tác đến vận hành nội bộ và ứng dụng quy trình sẵn sàng cho AI."
          )}</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="mailto:business@vitechintelligence.com?subject=Platform%20Development%20Project%20Brief">{t("Discuss your platform →", "Trao đổi về nền tảng của bạn →")}</a>
            <a className={styles.secondary} href="#case-study">{t("See the live case study", "Xem case study thực tế")}</a>
          </div>
          <div className={styles.trustRow}>
            <span><b>{t("Mobile-first", "Ưu tiên di động")}</b><small>{t("phone-ready by design", "thiết kế sẵn cho điện thoại")}</small></span>
            <span><b>{t("Role-based", "Theo vai trò")}</b><small>{t("users see what they need", "mỗi người chỉ thấy phần họ cần")}</small></span>
            <span><b>{t("Production-minded", "Sẵn sàng vận hành")}</b><small>{t("security and deployment included", "tính cả bảo mật và triển khai")}</small></span>
            <span><b>{t("AI-ready", "Sẵn sàng cho AI")}</b><small>{t("automation without replacing core logic", "tự động hóa mà không phá logic cốt lõi")}</small></span>
          </div>
        </div>

        <div className={styles.productPreview} aria-label={t("Animated preview of a ViTech training and operations platform", "Bản xem trước động của nền tảng đào tạo và vận hành ViTech")}>
          <div className={styles.previewAura} />
          <div className={styles.previewWindow}>
            <div className={styles.previewTopbar}>
              <span className={styles.windowDots}><i /><i /><i /></span>
              <b>{t("ViTech Training + Operations", "ViTech Đào tạo + Vận hành")}</b>
              <span className={styles.liveBadge}>{t("LIVE PREVIEW", "BẢN XEM TRƯỚC")}</span>
            </div>
            <div className={styles.previewBody}>
              <aside className={styles.previewSidebar}>
                <VitechMark className={styles.previewLogo} size={34} />
                <span className={styles.sideActive}>⌂</span><span>◎</span><span>↻</span><span>◫</span><span>⚙</span>
              </aside>
              <div className={styles.previewCanvas}>
                <div className={styles.previewHeading}>
                  <div><small>{t("Operations Command Center", "Trung tâm điều hành")}</small><b>{t("Training, delivery & workflow in one view", "Đào tạo, triển khai & quy trình trong một màn hình")}</b></div>
                  <span>EN <i /> VI</span>
                </div>
                <div className={styles.previewMetrics}>
                  <article><small>{t("Training", "Đào tạo")}</small><b>24</b><span>{t("active journeys", "lộ trình đang hoạt động")}</span></article>
                  <article><small>{t("Operations", "Vận hành")}</small><b>8</b><span>{t("work queues", "hàng đợi công việc")}</span></article>
                  <article><small>{t("Automation", "Tự động hóa")}</small><b>12</b><span>{t("workflow rules", "quy tắc workflow")}</span></article>
                </div>
                <div className={styles.previewGrid}>
                  <section className={styles.workflowCard}>
                    <div className={styles.cardTitle}><b>{t("Workflow automation", "Tự động hóa quy trình")}</b><span>{t("RUNNING", "ĐANG CHẠY")}</span></div>
                    <div className={styles.flowLine}>
                      <div><i>1</i><span>{t("Onboard", "Tiếp nhận")}</span></div><em />
                      <div><i>2</i><span>{t("Train", "Đào tạo")}</span></div><em />
                      <div><i>3</i><span>{t("Validate", "Xác thực")}</span></div><em />
                      <div><i>4</i><span>{t("Deploy", "Triển khai")}</span></div>
                    </div>
                    <div className={styles.automationRows}>
                      <span><i /> {t("New learner → assign journey", "Học viên mới → gán lộ trình")} <b>AUTO</b></span>
                      <span><i /> {t("Missed checkpoint → notify owner", "Bỏ lỡ mốc → báo người phụ trách")} <b>RULE</b></span>
                      <span><i /> {t("Completion → create evidence", "Hoàn tất → tạo minh chứng")} <b>SYNC</b></span>
                    </div>
                  </section>
                  <section className={styles.intelligenceCard}>
                    <div className={styles.cardTitle}><b>{t("Intelligence layer", "Lớp trí tuệ")}</b><span className={styles.aiPulse}>AI</span></div>
                    <div className={styles.insightHero}><strong>{t("3 signals need attention", "3 tín hiệu cần chú ý")}</strong><small>{t("Summarized across training + operations", "Tổng hợp từ đào tạo + vận hành")}</small></div>
                    <div className={styles.insightBars}><i /><i /><i /><i /></div>
                    <p>{t("Search · classify · summarize · recommend", "Tìm kiếm · phân loại · tóm tắt · gợi ý")}</p>
                  </section>
                  <section className={styles.visibilityCard}>
                    <div className={styles.cardTitle}><b>{t("Visibility", "Khả năng quan sát")}</b><span>{t("REAL-TIME VIEW", "THEO THỜI GIAN THỰC")}</span></div>
                    <div className={styles.miniChart}><i /><i /><i /><i /><i /><i /></div>
                    <div className={styles.statusRow}><span>{t("Delivery", "Triển khai")}</span><b>{t("Healthy", "Ổn định")}</b></div>
                    <div className={styles.statusRow}><span>{t("Exceptions", "Ngoại lệ")}</span><b>{t("2 open", "2 đang mở")}</b></div>
                  </section>
                  <section className={styles.securityCard}>
                    <div className={styles.cardTitle}><b>{t("Security + continuity", "Bảo mật + tính liên tục")}</b><span>{t("PROTECTED", "ĐƯỢC BẢO VỆ")}</span></div>
                    <div className={styles.securityRing}><span>✓</span></div>
                    <ul><li>{t("Role-based access", "Phân quyền theo vai trò")}</li><li>{t("Private data boundaries", "Ranh giới dữ liệu riêng tư")}</li><li>{t("Health checks + controlled releases", "Health check + phát hành có kiểm soát")}</li></ul>
                  </section>
                </div>
                <div className={styles.integrationBar}>
                  <b>{t("Integration-ready", "Sẵn sàng tích hợp")}</b>
                  <span>API</span><span>SSO</span><span>CRM</span><span>HR</span><span>PAY</span><span>MSG</span>
                  <em>{t("Localized · EN / VI / regional rules", "Bản địa hóa · EN / VI / quy tắc vùng")}</em>
                </div>
              </div>
            </div>
          </div>
          <span className={styles.floatChip + " " + styles.floatA}>{t("Workflow automation", "Tự động hóa quy trình")}</span>
          <span className={styles.floatChip + " " + styles.floatB}>{t("Security", "Bảo mật")}</span>
          <span className={styles.floatChip + " " + styles.floatC}>{t("Integrations", "Tích hợp")}</span>
          <span className={styles.floatChip + " " + styles.floatD}>{t("Localization", "Bản địa hóa")}</span>
        </div>
      </section>

      <section className={styles.capabilitySection} id="capabilities">
        <div className={styles.sectionHead}>
          <span>{t("What we build", "Chúng tôi xây gì")}</span>
          <h2>{t("Not just pages. Connected systems.", "Không chỉ là những trang giao diện. Là một hệ thống kết nối.")}</h2>
          <p>{t(
            "A good platform should connect the user experience, business workflow, permissions, data and production environment as one product.",
            "Một nền tảng tốt phải kết nối trải nghiệm người dùng, quy trình nghiệp vụ, phân quyền, dữ liệu và môi trường sản xuất thành một sản phẩm thống nhất."
          )}</p>
        </div>
        <div className={styles.capabilityGrid}>
          {capabilities.map(([number, title, copy]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
        <div className={styles.signalShowcase}>
          <div className={styles.signalIntro}>
            <span>{t("Platform proof patterns", "Các mẫu năng lực có thể chứng minh")}</span>
            <h3>{t("Build the capability into the product — not into a slide deck.", "Đưa năng lực vào sản phẩm — không chỉ đưa vào slide.")}</h3>
            <p>{t(
              "These are the platform patterns we design around so training and operations stay connected, observable and adaptable as the organization grows.",
              "Đây là các mẫu kiến trúc chúng tôi thiết kế xoay quanh để đào tạo và vận hành luôn kết nối, quan sát được và thích nghi khi tổ chức phát triển."
            )}</p>
          </div>
          <div className={styles.signalGrid}>
            {platformSignals.map(([title, copy], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><div><span>{title}</span><p>{copy}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className={styles.caseStudy} id="case-study">
        <div className={styles.caseCopy}>
          <span>{t("Live case study", "Case study đang hoạt động")}</span>
          <h2>{t("Career Compass Junior: from books to a connected learning platform.", "Career Compass Junior: từ bộ sách thành nền tảng học tập kết nối.")}</h2>
          <p>{t(
            "Career Compass Junior demonstrates the full-stack pattern: public discovery, interactive content, role-based LMS workspaces, a production database, installable mobile access and controlled operations for schools and learning centers.",
            "Career Compass Junior chứng minh mô hình full-stack: trang công khai để khám phá, nội dung tương tác, LMS theo vai trò, cơ sở dữ liệu sản xuất, khả năng cài trên điện thoại và vận hành có kiểm soát cho trường học và trung tâm."
          )}</p>
          <div className={styles.caseActions}>
            <Link className={styles.primaryLight} href="/international">{t("Open Career Compass Junior →", "Mở Career Compass Junior →")}</Link>
            <Link className={styles.caseLink} href="/portal/partner">{t("Preview the partner portal", "Xem trước cổng đối tác")}</Link>
          </div>
        </div>
        <div className={styles.proofGrid}>{proof.map(([title, copy]) => <article key={title}><b>{title}</b><p>{copy}</p></article>)}</div>
      </section>

      <section className={styles.architecture}>
        <div className={styles.sectionHead}><span>{t("How the product connects", "Sản phẩm được kết nối như thế nào")}</span><h2>{t("Back end, application logic and front end designed together.", "Back end, logic ứng dụng và front end được thiết kế cùng nhau.")}</h2></div>
        <div className={styles.archGrid}>
          <article><span>FRONT</span><h3>{t("Experience layer", "Lớp trải nghiệm")}</h3><p>{t("Responsive interfaces, dashboards, forms, learning experiences, client portals and installable mobile behavior.", "Giao diện responsive, dashboard, biểu mẫu, trải nghiệm học tập, cổng khách hàng và hành vi cài đặt trên điện thoại.")}</p></article>
          <article><span>MID</span><h3>{t("Application layer", "Lớp ứng dụng")}</h3><p>{t("Role rules, workflow states, server actions, validation, integrations, automation and business logic.", "Quy tắc vai trò, trạng thái workflow, server actions, kiểm tra dữ liệu, tích hợp, tự động hóa và logic nghiệp vụ.")}</p></article>
          <article><span>BACK</span><h3>{t("Data & identity layer", "Lớp dữ liệu & danh tính")}</h3><p>{t("Authentication, relational data models, permissions, evidence, operational records and production-safe data flows.", "Xác thực, mô hình dữ liệu quan hệ, phân quyền, minh chứng, hồ sơ vận hành và luồng dữ liệu an toàn cho môi trường thật.")}</p></article>
          <article><span>OPS</span><h3>{t("Production layer", "Lớp sản xuất")}</h3><p>{t("Deployment, environment configuration, security headers, health checks, observability and scalable release practices.", "Triển khai, cấu hình môi trường, security headers, health checks, khả năng quan sát và quy trình phát hành có thể mở rộng.")}</p></article>
        </div>
      </section>

      <section className={styles.processSection} id="process">
        <div className={styles.sectionHead}><span>{t("Delivery process", "Quy trình triển khai")}</span><h2>{t("Build enough structure to move fast without creating a mess later.", "Xây đủ cấu trúc để đi nhanh mà không tạo gánh nặng về sau.")}</h2></div>
        <div className={styles.timeline}>{delivery.map(([title, copy], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
      </section>

      <section className={styles.engagementSection} id="engagement">
        <div className={styles.sectionHead}>
          <span>{t("Ways to engage", "Cách hợp tác")}</span>
          <h2>{t("Start where the product actually is.", "Bắt đầu đúng từ trạng thái hiện tại của sản phẩm.")}</h2>
          <p>{t("We can begin with a focused pilot, build a platform from the ground up, or take over an existing prototype and harden it into a real product.", "Có thể bắt đầu bằng pilot tập trung, xây nền tảng từ đầu hoặc tiếp quản prototype hiện có và gia cố thành sản phẩm thật.")}</p>
        </div>
        <div className={styles.engagementGrid}>
          {engagement.map((item, index) => (
            <article className={styles.engagementCard} key={item.name}>
              <div className={styles.engagementPreview} aria-hidden="true">
                {index === 0 && <div className={styles.mvpPreview}>
                  <div className={styles.miniPhone}>
                    <div className={styles.miniPhoneTop}><span /><b>FieldFlow</b><i /></div>
                    <div className={styles.miniProgress}><i /><i /><i /></div>
                    <div className={styles.miniTask}><span>01</span><div><b>{t("New request", "Yêu cầu mới")}</b><small>{t("Captured from mobile", "Ghi nhận từ điện thoại")}</small></div><em>NEW</em></div>
                    <div className={styles.miniTask}><span>02</span><div><b>{t("Owner review", "Người phụ trách duyệt")}</b><small>{t("Rules + assignment", "Quy tắc + phân công")}</small></div><em>LIVE</em></div>
                    <div className={styles.miniTask}><span>03</span><div><b>{t("Ready to act", "Sẵn sàng xử lý")}</b><small>{t("One focused workflow", "Một workflow trọng tâm")}</small></div><em>✓</em></div>
                  </div>
                  <span className={styles.previewCaption}>{t("PROVE ONE WORKFLOW", "CHỨNG MINH MỘT WORKFLOW")}</span>
                </div>}
                {index === 1 && <div className={styles.fullBuildPreview}>
                  <div className={styles.fullPreviewHead}><b>{t("Operations Hub", "Trung tâm vận hành")}</b><span>{t("3 ROLES", "3 VAI TRÒ")}</span></div>
                  <div className={styles.roleTabs}><span>{t("Operator", "Nhân sự")}</span><span>{t("Manager", "Quản lý")}</span><span>{t("Partner", "Đối tác")}</span></div>
                  <div className={styles.fullPreviewStats}><b>42<small>{t("active cases", "case đang chạy")}</small></b><b>96%<small>{t("on track", "đúng tiến độ")}</small></b><b>7<small>{t("automations", "tự động hóa")}</small></b></div>
                  <div className={styles.fullPreviewBody}>
                    <div className={styles.queuePanel}><span><i /> {t("Intake", "Tiếp nhận")} <b>12</b></span><span><i /> {t("In progress", "Đang xử lý")} <b>23</b></span><span><i /> {t("Review", "Rà soát")} <b>7</b></span></div>
                    <div className={styles.livePanel}><small>{t("LIVE OPERATIONS", "VẬN HÀNH TRỰC TIẾP")}</small><div><i /><i /><i /><i /><i /></div><em>API · SSO · CRM · PAY</em></div>
                  </div>
                  <span className={styles.previewCaption}>{t("RUN THE BUSINESS", "VẬN HÀNH DOANH NGHIỆP")}</span>
                </div>}
                {index === 2 && <div className={styles.modernizePreview}>
                  <div className={styles.legacyPane}><small>{t("BEFORE", "TRƯỚC")}</small><span className={styles.legacySheet}><i /><i /><i /><i /></span><span className={styles.legacyBox}>{t("manual handoff", "bàn giao thủ công")}</span><span className={styles.legacyBox}>{t("duplicate data", "dữ liệu trùng lặp")}</span></div>
                  <div className={styles.transformRail}><i>→</i><span /></div>
                  <div className={styles.modernPane}><small>{t("AFTER", "SAU")}</small><div className={styles.modernHeader}><i /><b>{t("Unified workspace", "Không gian hợp nhất")}</b></div><div className={styles.modernCards}><span /><span /><span /></div><div className={styles.modernFooter}><b>{t("SECURE", "BẢO MẬT")}</b><b>MOBILE</b><b>{t("VISIBLE", "QUAN SÁT")}</b></div></div>
                  <span className={styles.previewCaption}>{t("MODERNIZE WITHOUT LOSING THE WORKFLOW", "HIỆN ĐẠI HÓA MÀ KHÔNG MẤT QUY TRÌNH")}</span>
                </div>}
              </div>
              <div className={styles.engagementCopy}><span>{item.name}</span><p>{item.best}</p><ul>{item.items.map((point) => <li key={point}>{point}</li>)}</ul></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.briefSection}>
        <div><span>{t("Project brief", "Tóm tắt dự án")}</span><h2>{t("You do not need a technical specification to start.", "Bạn không cần có tài liệu kỹ thuật để bắt đầu.")}</h2><p>{t("Tell us what people do today, what is painful, who needs access and what should become easier. We can translate that into the product structure.", "Chỉ cần cho chúng tôi biết mọi người đang làm gì hôm nay, điểm nào gây khó khăn, ai cần truy cập và điều gì cần trở nên dễ hơn. Chúng tôi sẽ chuyển điều đó thành cấu trúc sản phẩm.")}</p></div>
        <div className={styles.briefCards}>
          <span><b>1</b>{t("Who will use it?", "Ai sẽ sử dụng?")}</span>
          <span><b>2</b>{t("What do they need to do?", "Họ cần làm gì?")}</span>
          <span><b>3</b>{t("What data or tools already exist?", "Đã có dữ liệu hoặc công cụ nào?")}</span>
          <span><b>4</b>{t("What would make the project successful?", "Thế nào là dự án thành công?")}</span>
        </div>
        <a className={styles.primary} href="mailto:business@vitechintelligence.com?subject=ViTech%20Platform%20Development%20Brief">{t("Email a project brief →", "Gửi tóm tắt dự án qua email →")}</a>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.sectionHead}><span>{t("Frequently asked questions", "Câu hỏi thường gặp")}</span><h2>{t("What clients usually want to know first.", "Những điều khách hàng thường muốn biết trước.")}</h2></div>
        <div className={styles.faqGrid}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <section className={styles.finalCta}>
        <div><span>{t("ViTech Platform Development", "ViTech Phát triển nền tảng")}</span><h2>{t("Bring the workflow. We’ll help turn it into a product.", "Hãy mang quy trình đến. ViTech sẽ giúp biến nó thành sản phẩm.")}</h2><p>{t("Custom platform design and development for organizations that need more than a template website.", "Thiết kế và phát triển nền tảng tùy chỉnh cho các tổ chức cần nhiều hơn một website mẫu.")}</p></div>
        <div><a className={styles.primaryLight} href="mailto:business@vitechintelligence.com?subject=Platform%20Development%20Inquiry">business@vitechintelligence.com</a><Link className={styles.secondaryDark} href="/international">{t("View Career Compass Junior", "Xem Career Compass Junior")}</Link></div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><VitechMark className={styles.footerLogo} /><span><b>ViTech Intelligence Solutions</b><small>Smarter Skills. Stronger Teams.</small></span></div>
        <div><a href="https://vitechintelligence.com">ViTechIntelligence.com</a><a href="mailto:business@vitechintelligence.com">{t("Business inquiries", "Liên hệ kinh doanh")}</a><a href="#top">{t("Back to top ↑", "Lên đầu trang ↑")}</a></div>
        <small>© 2026 ViTech Intelligence Solutions. {t("Platform development capability page.", "Trang giới thiệu năng lực phát triển nền tảng.")}</small>
      </footer>
    </main>
  );
}
