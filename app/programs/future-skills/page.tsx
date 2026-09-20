import Link from "next/link";
import { VitechMark } from "@/app/VitechMark";
import {
  FUTURE_SKILLS_DELIVERY_MODEL,
  FUTURE_SKILLS_PATHWAYS,
  FUTURE_SKILLS_TRACKS,
  type FutureSkillsAgeBand,
} from "@/lib/future-skills-curriculum";

export const dynamic = "force-dynamic";

const AGE_BANDS: FutureSkillsAgeBand[] = ["7-9", "10-12", "13-15", "16-18"];

export default async function FutureSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; age?: string }>;
}) {
  const params = await searchParams;
  const vi = params.lang === "vi";
  const selectedAge = AGE_BANDS.includes(params.age as FutureSkillsAgeBand)
    ? (params.age as FutureSkillsAgeBand)
    : null;
  const pathways = selectedAge
    ? FUTURE_SKILLS_PATHWAYS.filter((pathway) => pathway.ageBand === selectedAge)
    : FUTURE_SKILLS_PATHWAYS;

  return (
    <main className="workspacePage">
      <header className="topbar">
        <Link className="brand" href="/"><VitechMark /><span>Career Compass Junior</span></Link>
        <div><strong>{vi ? "K12 Future Skills" : "K12 Future Skills"}</strong><div className="muted" style={{ fontSize: 12 }}>{vi ? "STEM · STEAM · AI · Robotics" : "STEM · STEAM · AI · Robotics"}</div></div>
        <div className="actions"><Link className="pill" href="/programs/future-skills?lang=en">EN</Link><Link className="pill" href="/programs/future-skills?lang=vi">VI</Link></div>
      </header>

      <div className="workspaceContent">
        <section className="workspaceIdentity">
          <div>
            <div className="eyebrow">ViTech K12 Future Skills</div>
            <h1 className="workspaceHeroTitle">{vi ? "Học kỹ năng tương lai theo độ tuổi, theo dự án và có tiến trình rõ ràng." : "Future skills taught progressively, by age and through real projects."}</h1>
            <p className="muted">{vi
              ? "Mỗi lộ trình gồm 12 buổi, kết hợp tiếng Anh thực hành với STEM, STEAM, nền tảng AI, AI cấp độ 2 và Robotics. Nội dung được bản địa hóa để giáo viên có thể triển khai trong môi trường Việt Nam mà không làm giảm tính quốc tế."
              : "Each pathway uses 12 sessions combining practical English with STEM, STEAM, AI Foundations, AI Level 2 and Robotics. The curriculum is localized for Vietnamese delivery while keeping international technical language and project habits."
            }</p>
          </div>
          <Link className="button primary" href="/workspace/partner">{vi ? "Dành cho đối tác" : "Partner access"}</Link>
        </section>

        <section className="metricGrid">
          <Metric label={vi ? "Nhóm tuổi" : "Age bands"} value="4" detail="7–9 · 10–12 · 13–15 · 16–18" />
          <Metric label={vi ? "Lộ trình" : "Pathways"} value="20" detail={vi ? "5 lĩnh vực × 4 nhóm tuổi" : "5 tracks × 4 age bands"} />
          <Metric label={vi ? "Buổi / lộ trình" : "Sessions / pathway"} value="12" detail={vi ? "2 buổi cho mỗi đơn vị học tập" : "2 sessions per learning unit"} />
          <Metric label={vi ? "Ngôn ngữ" : "Language"} value="EN + VI" detail={vi ? "Tiếng Anh dẫn dắt, tiếng Việt hỗ trợ" : "English-led with Vietnamese scaffolding"} />
        </section>

        <section className="panel">
          <div className="eyebrow">{vi ? "Chọn độ tuổi" : "Choose an age band"}</div>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link className="button" href={`/programs/future-skills?lang=${vi ? "vi" : "en"}`}>{vi ? "Tất cả" : "All ages"}</Link>
            {AGE_BANDS.map((age) => <Link className={`button ${selectedAge === age ? "primary" : ""}`} key={age} href={`/programs/future-skills?lang=${vi ? "vi" : "en"}&age=${age}`}>{age}</Link>)}
          </div>
        </section>

        <section className="cardGrid">
          {FUTURE_SKILLS_TRACKS.map((track) => (
            <article className="card" key={track.key}>
              <span className="pill">{track.key.toUpperCase()}</span>
              <h2>{vi ? track.titleVi : track.titleEn}</h2>
              <p className="muted">{vi ? track.summaryVi : track.summaryEn}</p>
            </article>
          ))}
        </section>

        {pathways.map((pathway) => (
          <section className="panel" key={`${pathway.track}-${pathway.ageBand}`}>
            <div className="workspaceIdentity">
              <div>
                <div className="eyebrow">{vi ? `Độ tuổi ${pathway.ageBand}` : `Ages ${pathway.ageBand}`}</div>
                <h2 className="workspaceTitle">{vi ? pathway.trackTitleVi : pathway.trackTitleEn}</h2>
                <strong>{vi ? pathway.stageVi : pathway.stageEn}</strong>
                <p className="muted">{vi ? pathway.pedagogyVi : pathway.pedagogyEn}</p>
              </div>
              <span className="pill">{pathway.sessions} {vi ? "buổi" : "sessions"} · {FUTURE_SKILLS_DELIVERY_MODEL.sessionMinutes[pathway.ageBand]} min</span>
            </div>

            <div className="workspaceList">
              {pathway.units.map((unit, index) => (
                <div className="workspaceRow" key={unit.code}>
                  <div>
                    <strong>{String(index + 1).padStart(2, "0")} · {vi ? unit.titleVi : unit.titleEn}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>{vi ? unit.objectiveVi : unit.objectiveEn}</div>
                    <div className="muted" style={{ marginTop: 4 }}><b>{vi ? "Dự án:" : "Build:"}</b> {vi ? unit.buildVi : unit.buildEn}</div>
                    <div className="tagRow" style={{ marginTop: 8 }}>{unit.englishFocus.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
                  </div>
                  <span className="pill">{unit.code}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="panel">
          <div className="eyebrow">{vi ? "Mẫu sư phạm chung" : "Shared lesson pattern"}</div>
          <h2 className="workspaceTitle">{vi ? "Mỗi buổi học đều tạo ra hành động và minh chứng." : "Every lesson produces action and evidence."}</h2>
          <div className="miniGrid">
            {(vi ? FUTURE_SKILLS_DELIVERY_MODEL.lessonPatternVi : FUTURE_SKILLS_DELIVERY_MODEL.lessonPatternEn).map((step, index) => (
              <div className="miniCard light" key={step}><strong>{index + 1}</strong><span>{step}</span></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span className="muted">{label}</span><strong>{value}</strong><span className="muted">{detail}</span></div>;
}
