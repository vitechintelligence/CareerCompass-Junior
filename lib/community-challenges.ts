import { COMMUNITY_BRIDGE_MISSIONS } from "@/lib/steam-missions";
import { LEARNER_AGE_PROFILES, type LearnerAgeBand } from "@/lib/learner-age-bands";

export type ParticipationMode = "individual" | "small_group" | "large_group";

export type CommunityChallengeTemplate = {
  templateKey: string;
  missionKey: string;
  studioKey: "integrated-steam";
  ageBand: LearnerAgeBand;
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
  { key: "collaboration", labelEn: "Collaboration / self-direction", labelVi: "Hợp tác / tự chủ", points: 20 },
  { key: "evidence", labelEn: "Evidence & reasoning", labelVi: "Minh chứng & lập luận", points: 20 },
  { key: "resilience", labelEn: "Iteration & resilience", labelVi: "Cải tiến & bền bỉ", points: 25 },
  { key: "communication", labelEn: "Communication", labelVi: "Giao tiếp", points: 15 },
  { key: "solution", labelEn: "Solution quality & creativity", labelVi: "Chất lượng & sáng tạo", points: 20 },
] as const;

export function rubricForMode(mode: ParticipationMode) {
  return COMMUNITY_RUBRIC.map((item) =>
    item.key === "collaboration" && mode === "individual"
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

function modeFrame(mode: ParticipationMode, ageBand: LearnerAgeBand) {
  const profile = LEARNER_AGE_PROFILES[ageBand];
  const older = ageBand === "14-16" || ageBand === "17-18";

  if (mode === "individual") {
    return {
      min: 1,
      max: 1,
      titleEn: "Solo Design Sprint",
      titleVi: "Thử thách Thiết kế Cá nhân",
      briefEn: older
        ? "Work independently like a junior designer. Document assumptions, test at least two scenarios, explain a trade-off and show what changed between versions."
        : "Build by yourself. Test the bridge, notice what happens, make one change and explain what became better.",
      briefVi: older
        ? "Làm việc độc lập như một nhà thiết kế trẻ. Ghi lại giả định, thử ít nhất hai kịch bản, giải thích một sự đánh đổi và cho thấy thay đổi giữa các phiên bản."
        : "Tự xây cầu. Thử cầu, quan sát điều xảy ra, thay đổi một điểm rồi giải thích điều gì tốt hơn.",
      deliverablesEn: ["Bridge prototype", "Attempt 1 → change → Attempt 2 evidence", "Short explanation"],
      deliverablesVi: ["Mẫu cầu", "Minh chứng Lần thử 1 → thay đổi → Lần thử 2", "Giải thích ngắn"],
      rolesEn: ["Solo Designer"],
      rolesVi: ["Nhà thiết kế độc lập"],
      bonusEn: "Comeback recognition: show a failed or weak attempt and the evidence-based change you made.",
      bonusVi: "Ghi nhận bền bỉ: cho thấy một lần thử chưa tốt và thay đổi dựa trên minh chứng.",
    };
  }

  if (mode === "small_group") {
    return {
      min: 2,
      max: Math.min(profile.maxTeamSize, 5),
      titleEn: "Bridge Squad",
      titleVi: "Đội Thiết kế Cầu",
      briefEn: older
        ? "Work as a compact design team. Divide roles, agree on constraints, test the bridge, critique the result and improve the design together."
        : "Work as a small team. Give everyone a job, test together and explain what the team changed after the first test.",
      briefVi: older
        ? "Làm như một đội thiết kế nhỏ. Chia vai, thống nhất ràng buộc, thử cầu, phản biện kết quả và cùng cải tiến."
        : "Làm theo nhóm nhỏ. Mỗi bạn có một nhiệm vụ, cùng thử cầu và giải thích đội đã thay đổi gì sau lần thử đầu.",
      deliverablesEn: ["Team bridge prototype", "Role card for every member", "Test evidence", "Team pitch"],
      deliverablesVi: ["Mẫu cầu của đội", "Vai trò cho từng thành viên", "Minh chứng thử nghiệm", "Thuyết trình đội"],
      rolesEn: older
        ? ["Design Lead", "Structure Lead", "Evidence Lead", "Community/User Lead", "Presenter"]
        : ["Planner", "Builder", "Tester", "Recorder", "Presenter"],
      rolesVi: older
        ? ["Trưởng thiết kế", "Phụ trách kết cấu", "Phụ trách minh chứng", "Phụ trách cộng đồng/người dùng", "Thuyết trình"]
        : ["Lập kế hoạch", "Xây dựng", "Kiểm thử", "Ghi chép", "Thuyết trình"],
      bonusEn: "Team resilience recognition: show one disagreement, failed test or constraint conflict and how the team resolved it.",
      bonusVi: "Ghi nhận bền bỉ nhóm: cho thấy một bất đồng, lần thử chưa đạt hoặc xung đột ràng buộc và cách đội xử lý.",
    };
  }

  return {
    min: 6,
    max: ageBand === "7-9" ? 12 : ageBand === "10-13" ? 18 : 30,
    titleEn: "Community Bridge Lab",
    titleVi: "Phòng Lab Cầu Cộng đồng",
    briefEn: older
      ? "Operate as a large design studio. Split into specialist subteams for structure, resources, accessibility, community experience and communication; integrate the parts and run a public design review."
      : "Work as one big class team with smaller stations. Each station solves one part of the bridge, then combine the ideas into one shared community design.",
    briefVi: older
      ? "Vận hành như một studio thiết kế lớn. Chia thành nhóm kết cấu, nguồn lực, khả năng tiếp cận, trải nghiệm cộng đồng và truyền thông; tích hợp các phần và tổ chức buổi review."
      : "Làm như một đội lớp lớn với nhiều trạm nhỏ. Mỗi trạm giải một phần của cây cầu rồi ghép các ý tưởng thành một thiết kế chung.",
    deliverablesEn: ["Shared bridge system", "Subteam contribution map", "Integration test", "Community showcase"],
    deliverablesVi: ["Hệ cầu chung", "Bản đồ đóng góp các nhóm", "Kiểm thử tích hợp", "Showcase cộng đồng"],
    rolesEn: ["Studio Lead", "Structure Squad", "Resource Squad", "Creative/User Squad", "Test & Evidence Squad", "Communication Squad"],
    rolesVi: ["Điều phối studio", "Nhóm kết cấu", "Nhóm nguồn lực", "Nhóm sáng tạo/người dùng", "Nhóm kiểm thử & minh chứng", "Nhóm truyền thông"],
    bonusEn: "Integration recognition: identify one mismatch between subteams and fix it before the showcase.",
    bonusVi: "Ghi nhận tích hợp: phát hiện một điểm chưa khớp giữa các nhóm và sửa trước showcase.",
  };
}

function agePrompts(ageBand: LearnerAgeBand) {
  if (ageBand === "7-9") {
    return {
      en: ["What happened when you tested it?", "What did you change?", "What are you proud of?"],
      vi: ["Điều gì xảy ra khi em thử?", "Em đã thay đổi gì?", "Em tự hào về điều gì?"],
    };
  }
  if (ageBand === "10-13") {
    return {
      en: ["What did you measure?", "What changed between attempt 1 and 2?", "How did budget or materials affect your choice?"],
      vi: ["Em đã đo gì?", "Điều gì thay đổi giữa lần thử 1 và 2?", "Ngân sách hoặc vật liệu ảnh hưởng lựa chọn thế nào?"],
    };
  }
  if (ageBand === "14-16") {
    return {
      en: ["Which trade-off was hardest?", "What evidence changed your design?", "How does the bridge serve different users?"],
      vi: ["Đánh đổi nào khó nhất?", "Minh chứng nào làm bạn đổi thiết kế?", "Cầu phục vụ các nhóm người dùng khác nhau thế nào?"],
    };
  }
  return {
    en: ["Which assumption most affected performance?", "Which scenario exposed the biggest weakness?", "How would you defend the trade-off to a client or community?"],
    vi: ["Giả định nào ảnh hưởng hiệu năng nhiều nhất?", "Kịch bản nào bộc lộ điểm yếu lớn nhất?", "Bạn sẽ bảo vệ sự đánh đổi này với khách hàng hoặc cộng đồng thế nào?"],
  };
}

export const COMMUNITY_CHALLENGE_LIBRARY: CommunityChallengeTemplate[] =
  (Object.keys(COMMUNITY_BRIDGE_MISSIONS) as LearnerAgeBand[]).flatMap((ageBand) => {
    const mission = COMMUNITY_BRIDGE_MISSIONS[ageBand];
    const prompts = agePrompts(ageBand);
    return (["individual","small_group","large_group"] as ParticipationMode[]).map((mode) => {
      const frame = modeFrame(mode, ageBand);
      return {
        templateKey: `${mission.key}-${ageBand}-${mode}`,
        missionKey: mission.key,
        studioKey: "integrated-steam",
        ageBand,
        participationMode: mode,
        minTeamSize: frame.min,
        maxTeamSize: frame.max,
        titleEn: `${frame.titleEn}: ${mission.titleEn}`,
        titleVi: `${frame.titleVi}: ${mission.titleVi}`,
        briefEn: `${mission.missionPromptEn} ${frame.briefEn}`,
        briefVi: `${mission.missionPromptVi} ${frame.briefVi}`,
        deliverablesEn: frame.deliverablesEn,
        deliverablesVi: frame.deliverablesVi,
        rolesEn: frame.rolesEn,
        rolesVi: frame.rolesVi,
        skillsFocus: mission.skillTags,
        advisorPromptsEn: prompts.en,
        advisorPromptsVi: prompts.vi,
        bonusRuleEn: frame.bonusEn,
        bonusRuleVi: frame.bonusVi,
      };
    });
  });

export function getChallengeTemplate(templateKey: string) {
  return COMMUNITY_CHALLENGE_LIBRARY.find((item) => item.templateKey === templateKey) ?? null;
}

export function challengeModeLabel(mode: ParticipationMode, vi = false) {
  if (mode === "individual") return vi ? "Cá nhân" : "Individual";
  if (mode === "small_group") return vi ? "Nhóm nhỏ" : "Small group";
  return vi ? "Nhóm lớn" : "Large group";
}

export const QUARTERLY_FORMAT = [
  { stage: "Build", weeks: "1–5", en: "Learners explore, form teams and build first versions.", vi: "Học sinh khám phá, lập đội và xây phiên bản đầu." },
  { stage: "Review", weeks: "6–8", en: "Advisors give structured feedback. Learners improve instead of being eliminated immediately.", vi: "Cố vấn phản hồi có cấu trúc. Học sinh cải tiến thay vì bị loại ngay." },
  { stage: "Qualify", weeks: "9–10", en: "The institution selects showcase entries using evidence, resilience, creativity and communication.", vi: "Cơ sở chọn bài showcase dựa trên minh chứng, bền bỉ, sáng tạo và giao tiếp." },
  { stage: "Showcase", weeks: "11–12", en: "Finalists demonstrate, explain and receive recognition under institution-controlled visibility.", vi: "Đội vào vòng cuối demo, giải thích và nhận ghi nhận trong phạm vi hiển thị do cơ sở kiểm soát." },
] as const;
