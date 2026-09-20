import {
  FUTURE_SKILLS_PATHWAYS,
  type FutureSkillsAgeBand,
  type FutureSkillsTrack,
} from "@/lib/future-skills-curriculum";

export type ParticipationMode = "individual" | "small_group" | "large_group";

export type CommunityChallengeTemplate = {
  templateKey: string;
  track: FutureSkillsTrack;
  ageBand: FutureSkillsAgeBand;
  unitCode: string;
  participationMode: ParticipationMode;
  minTeamSize: number;
  maxTeamSize: number;
  titleEn: string;
  titleVi: string;
  briefEn: string;
  briefVi: string;
  deliverablesEn: string[];
  deliverablesVi: string[];
  rolesEn: string[];
  rolesVi: string[];
  skillsFocus: string[];
  advisorPromptsEn: string[];
  advisorPromptsVi: string[];
  bonusRuleEn: string;
  bonusRuleVi: string;
};

export const COMMUNITY_RUBRIC = [
  { key: "teamwork", labelEn: "Teamwork & role sharing", labelVi: "Hợp tác & chia vai", points: 25 },
  { key: "evidence", labelEn: "Evidence & reasoning", labelVi: "Minh chứng & lập luận", points: 20 },
  { key: "resilience", labelEn: "Iteration & resilience", labelVi: "Cải tiến & bền bỉ", points: 25 },
  { key: "communication", labelEn: "English / technical communication", labelVi: "Giao tiếp tiếng Anh / kỹ thuật", points: 15 },
  { key: "solution", labelEn: "Solution quality", labelVi: "Chất lượng giải pháp", points: 15 },
] as const;


export function rubricForMode(mode: ParticipationMode) {
  if (mode !== "individual") return COMMUNITY_RUBRIC.map((item) => ({ ...item }));
  return COMMUNITY_RUBRIC.map((item) =>
    item.key === "teamwork"
      ? { ...item, key: "self_direction", labelEn: "Self-direction & process", labelVi: "Tự chủ & quy trình" }
      : { ...item },
  );
}

export const COMMUNITY_KUDOS = [
  { key: "inspiring", labelEn: "Inspiring", labelVi: "Truyền cảm hứng", icon: "✨" },
  { key: "clever", labelEn: "Clever idea", labelVi: "Ý tưởng thông minh", icon: "💡" },
  { key: "teamwork", labelEn: "Strong teamwork", labelVi: "Hợp tác tốt", icon: "🤝" },
  { key: "resilience", labelEn: "Great comeback", labelVi: "Bền bỉ cải tiến", icon: "🔁" },
  { key: "clear_explanation", labelEn: "Clear explanation", labelVi: "Giải thích rõ", icon: "🎤" },
] as const;

function modeFrame(mode: ParticipationMode, ageBand: FutureSkillsAgeBand) {
  const older = ageBand === "13-15" || ageBand === "16-18";

  if (mode === "individual") {
    return {
      min: 1,
      max: 1,
      titleEn: "Solo Skill Sprint",
      titleVi: "Thử thách cá nhân",
      briefEn: older
        ? "Work independently like a developer or maker preparing a portfolio piece. Document your decisions, test at least once, and explain what you would improve next."
        : "Build or explain the idea by yourself. Show one test, one thing you learned and one next step.",
      briefVi: older
        ? "Làm việc độc lập như một developer hoặc maker đang chuẩn bị sản phẩm portfolio. Ghi lại quyết định, thử nghiệm ít nhất một lần và giải thích điều sẽ cải tiến tiếp theo."
        : "Tự làm hoặc giải thích ý tưởng. Thể hiện một lần thử, một điều đã học và một bước tiếp theo.",
      deliverablesEn: ["Working idea / prototype", "Short build log", "60–90 second explanation"],
      deliverablesVi: ["Ý tưởng / mẫu hoạt động được", "Nhật ký làm ngắn", "Giải thích 60–90 giây"],
      rolesEn: ["Solo Builder"],
      rolesVi: ["Người xây độc lập"],
      bonusEn: "Comeback bonus: show a failed attempt and the change you made. +5 recognition points.",
      bonusVi: "Điểm trở lại: cho thấy một lần chưa thành công và thay đổi đã thực hiện. +5 điểm ghi nhận.",
    };
  }

  if (mode === "small_group") {
    return {
      min: 2,
      max: 5,
      titleEn: "Squad Build",
      titleVi: "Thử thách nhóm nhỏ",
      briefEn: older
        ? "Work as a compact product team. Divide roles, integrate everyone's contribution, run a test, then present the evidence behind your final design."
        : "Build as a small team. Give everyone a role, test together and explain what changed after feedback.",
      briefVi: older
        ? "Làm việc như một nhóm sản phẩm nhỏ. Chia vai, tích hợp đóng góp của mọi người, thử nghiệm và trình bày minh chứng cho thiết kế cuối."
        : "Làm theo nhóm nhỏ. Mỗi người có vai trò, cùng thử nghiệm và giải thích điều đã thay đổi sau phản hồi.",
      deliverablesEn: ["Team prototype / demo", "Role card for every member", "Test evidence", "Team pitch"],
      deliverablesVi: ["Mẫu / demo của đội", "Vai trò cho từng thành viên", "Minh chứng thử nghiệm", "Phần thuyết trình đội"],
      rolesEn: ["Coordinator", "Builder / Creator", "Tester", "Evidence Keeper", "Presenter"],
      rolesVi: ["Điều phối", "Người xây / sáng tạo", "Kiểm thử", "Ghi minh chứng", "Thuyết trình"],
      bonusEn: "Team resilience bonus: document one disagreement or failed test and how the team improved it. +5 team points.",
      bonusVi: "Điểm bền bỉ nhóm: ghi lại một bất đồng hoặc lần thử chưa đạt và cách đội cải tiến. +5 điểm đội.",
    };
  }

  return {
    min: 6,
    max: 30,
    titleEn: "Community Lab",
    titleVi: "Phòng lab cộng đồng",
    briefEn: older
      ? "Operate as a larger engineering studio. Split into specialist subteams, define interfaces, integrate the parts, run a system test and hold a public design review."
      : "Work as one big class team with smaller stations. Each station solves one part, then everyone combines the parts into one shared result.",
    briefVi: older
      ? "Vận hành như một studio kỹ thuật lớn. Chia thành các nhóm chuyên môn, xác định phần giao tiếp giữa các nhóm, tích hợp, kiểm thử hệ thống và tổ chức buổi review thiết kế."
      : "Làm như một đội lớp lớn với nhiều trạm nhỏ. Mỗi trạm giải một phần rồi cả lớp ghép thành kết quả chung.",
    deliverablesEn: ["Shared system / exhibition", "Subteam contribution map", "Integration test", "Large-group showcase"],
    deliverablesVi: ["Hệ thống / triển lãm chung", "Bản đồ đóng góp các nhóm", "Kiểm thử tích hợp", "Showcase nhóm lớn"],
    rolesEn: ["Program Lead", "Build Squad", "Test Squad", "Research Squad", "Communication Squad"],
    rolesVi: ["Điều phối chương trình", "Nhóm xây dựng", "Nhóm kiểm thử", "Nhóm nghiên cứu", "Nhóm truyền thông"],
    bonusEn: "Integration bonus: identify one interface failure between subteams and fix it before showcase. +5 team points.",
    bonusVi: "Điểm tích hợp: phát hiện một lỗi giao tiếp giữa các nhóm và sửa trước showcase. +5 điểm đội.",
  };
}

function trackFlavor(track: FutureSkillsTrack, mode: ParticipationMode) {
  const common = {
    stem: {
      en: "Use measurements, fair tests and evidence. A strong entry explains why the result happened.",
      vi: "Dùng đo lường, thử nghiệm công bằng và minh chứng. Bài tốt giải thích vì sao kết quả xảy ra.",
      skills: ["measurement", "evidence", "engineering", "problem solving"],
      promptsEn: ["What did you measure?", "What changed between test 1 and test 2?", "Which evidence supports your decision?"],
      promptsVi: ["Bạn đã đo gì?", "Điều gì thay đổi giữa lần thử 1 và 2?", "Minh chứng nào hỗ trợ quyết định?"],
    },
    steam: {
      en: "Balance function, creativity and user experience. A strong entry can explain both how it works and why the design choice matters.",
      vi: "Cân bằng chức năng, sáng tạo và trải nghiệm người dùng. Bài tốt giải thích được cả cách hoạt động và lý do lựa chọn thiết kế.",
      skills: ["design", "creativity", "user experience", "communication"],
      promptsEn: ["Who is this for?", "What design choice improved the experience?", "How did feedback change the final version?"],
      promptsVi: ["Sản phẩm dành cho ai?", "Lựa chọn thiết kế nào cải thiện trải nghiệm?", "Phản hồi đã thay đổi phiên bản cuối thế nào?"],
    },
    "ai-foundation": {
      en: "Treat AI as a system that must be checked. Explain data/examples, possible mistakes, privacy and where a human should decide.",
      vi: "Xem AI là hệ thống cần được kiểm tra. Giải thích dữ liệu/ví dụ, lỗi có thể xảy ra, riêng tư và nơi con người phải quyết định.",
      skills: ["AI literacy", "data", "evaluation", "responsible AI"],
      promptsEn: ["What examples or data does the system use?", "How could it be wrong?", "Where is the human check?"],
      promptsVi: ["Hệ thống dùng ví dụ hoặc dữ liệu nào?", "Nó có thể sai thế nào?", "Con người kiểm tra ở đâu?"],
    },
    "ai-level-2": {
      en: "Build like a junior AI product team: define the task, architecture, evaluation, safeguards and observable failure cases.",
      vi: "Xây như một đội sản phẩm AI trẻ: xác định nhiệm vụ, kiến trúc, đánh giá, biện pháp bảo vệ và các trường hợp lỗi quan sát được.",
      skills: ["AI systems", "evaluation", "prompting", "retrieval", "agents", "safety"],
      promptsEn: ["What is the system boundary?", "How will you evaluate quality?", "What happens when the AI is uncertain or wrong?"],
      promptsVi: ["Ranh giới hệ thống là gì?", "Bạn đánh giá chất lượng thế nào?", "Điều gì xảy ra khi AI không chắc hoặc sai?"],
    },
    robotics: {
      en: "Think like a robotics team: sense, decide, act, test. Explain the physical system, control logic and failure recovery.",
      vi: "Tư duy như đội robotics: cảm nhận, quyết định, hành động, thử nghiệm. Giải thích hệ vật lý, logic điều khiển và cách phục hồi khi lỗi.",
      skills: ["robotics", "sensors", "control", "testing", "systems thinking"],
      promptsEn: ["What does the robot sense?", "What control rule makes it act?", "What failed during testing and how did you recover?"],
      promptsVi: ["Robot cảm nhận gì?", "Quy tắc điều khiển nào làm robot hành động?", "Điều gì lỗi khi thử và bạn phục hồi thế nào?"],
    },
  }[track];

  if (mode === "large_group") {
    return {
      ...common,
      skills: [...common.skills, "systems integration", "leadership"],
    };
  }
  if (mode === "small_group") {
    return {
      ...common,
      skills: [...common.skills, "collaboration"],
    };
  }
  return {
    ...common,
    skills: [...common.skills, "self-management"],
  };
}

export const COMMUNITY_CHALLENGE_LIBRARY: CommunityChallengeTemplate[] =
  FUTURE_SKILLS_PATHWAYS.flatMap((pathway) =>
    pathway.units.flatMap((unit) =>
      (["individual", "small_group", "large_group"] as ParticipationMode[]).map((mode) => {
        const frame = modeFrame(mode, pathway.ageBand);
        const flavor = trackFlavor(pathway.track, mode);
        return {
          templateKey: `${pathway.track}-${pathway.ageBand}-${unit.code}-${mode}`.toLowerCase(),
          track: pathway.track,
          ageBand: pathway.ageBand,
          unitCode: unit.code,
          participationMode: mode,
          minTeamSize: frame.min,
          maxTeamSize: frame.max,
          titleEn: `${frame.titleEn}: ${unit.titleEn}`,
          titleVi: `${frame.titleVi}: ${unit.titleVi}`,
          briefEn: `${unit.buildEn} ${frame.briefEn} ${flavor.en}`,
          briefVi: `${unit.buildVi} ${frame.briefVi} ${flavor.vi}`,
          deliverablesEn: frame.deliverablesEn,
          deliverablesVi: frame.deliverablesVi,
          rolesEn: frame.rolesEn,
          rolesVi: frame.rolesVi,
          skillsFocus: Array.from(new Set([...flavor.skills, ...unit.englishFocus])),
          advisorPromptsEn: flavor.promptsEn,
          advisorPromptsVi: flavor.promptsVi,
          bonusRuleEn: frame.bonusEn,
          bonusRuleVi: frame.bonusVi,
        };
      }),
    ),
  );

export function getChallengeTemplate(templateKey: string) {
  return COMMUNITY_CHALLENGE_LIBRARY.find((item) => item.templateKey === templateKey) ?? null;
}

export function challengeModeLabel(mode: ParticipationMode, vi = false) {
  if (mode === "individual") return vi ? "Cá nhân" : "Individual";
  if (mode === "small_group") return vi ? "Nhóm nhỏ" : "Small group";
  return vi ? "Nhóm lớn" : "Large group";
}

export const QUARTERLY_FORMAT = [
  {
    stage: "Build",
    weeks: "1–5",
    en: "Learners form teams, choose challenges and build first versions.",
    vi: "Học sinh lập đội, chọn thử thách và xây phiên bản đầu.",
  },
  {
    stage: "Review",
    weeks: "6–8",
    en: "Advisors give structured feedback. Teams improve instead of being eliminated.",
    vi: "Cố vấn phản hồi có cấu trúc. Đội cải tiến thay vì bị loại ngay.",
  },
  {
    stage: "Qualify",
    weeks: "9–10",
    en: "Partners select institution finalists using evidence, resilience and communication.",
    vi: "Đối tác chọn đội vào vòng showcase dựa trên minh chứng, bền bỉ và giao tiếp.",
  },
  {
    stage: "Showcase",
    weeks: "11–12",
    en: "Finalists demo, explain and receive recognition. Network sharing remains partner/admin controlled.",
    vi: "Đội vào vòng cuối demo, giải thích và nhận ghi nhận. Chia sẻ ra mạng lưới vẫn do đối tác/admin kiểm soát.",
  },
] as const;
