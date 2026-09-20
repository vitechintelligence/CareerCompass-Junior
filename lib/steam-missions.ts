import { LEARNER_AGE_PROFILES, type LearnerAgeBand } from "@/lib/learner-age-bands";

export type SteamStudioKey =
  | "science"
  | "technology"
  | "engineering"
  | "creative-design"
  | "math-logic"
  | "green-innovation"
  | "robotics"
  | "future-space"
  | "invention";

export type SteamMissionDefinition = {
  key: string;
  titleEn: string;
  titleVi: string;
  summaryEn: string;
  summaryVi: string;
  studios: SteamStudioKey[];
  ageBand: LearnerAgeBand;
  difficultyLabelEn: string;
  difficultyLabelVi: string;
  missionPromptEn: string;
  missionPromptVi: string;
  constraints: Array<{ key: string; labelEn: string; labelVi: string; min?: number; max?: number; options?: string[] }>;
  skillTags: string[];
  reflectionPromptsEn: string[];
  reflectionPromptsVi: string[];
  careerConnections: Array<{ labelEn: string; labelVi: string }>;
};

export const STEAM_STUDIOS = [
  { key: "science" as const, icon: "🔬", labelEn: "Science Studio", labelVi: "Studio Khoa học" },
  { key: "technology" as const, icon: "💻", labelEn: "Technology Studio", labelVi: "Studio Công nghệ" },
  { key: "engineering" as const, icon: "🏗️", labelEn: "Engineering Studio", labelVi: "Studio Kỹ thuật" },
  { key: "creative-design" as const, icon: "🎨", labelEn: "Creative Design Studio", labelVi: "Studio Thiết kế Sáng tạo" },
  { key: "math-logic" as const, icon: "➗", labelEn: "Math & Logic Studio", labelVi: "Studio Toán & Logic" },
  { key: "green-innovation" as const, icon: "🌱", labelEn: "Green Innovation Studio", labelVi: "Studio Đổi mới Xanh" },
  { key: "robotics" as const, icon: "🤖", labelEn: "Robotics Studio", labelVi: "Studio Robotics" },
  { key: "future-space" as const, icon: "🚀", labelEn: "Future & Space Studio", labelVi: "Studio Tương lai & Không gian" },
  { key: "invention" as const, icon: "💡", labelEn: "Invention Studio", labelVi: "Studio Phát minh" },
] as const;

const BRIDGE_BASE = {
  key: "community-bridge-designer",
  titleEn: "Community Bridge Designer",
  titleVi: "Nhà thiết kế Cầu Cộng đồng",
  summaryEn: "Design, test and improve a bridge that helps people in a community.",
  summaryVi: "Thiết kế, thử nghiệm và cải tiến một cây cầu giúp ích cho cộng đồng.",
  studios: ["science","technology","engineering","creative-design","math-logic"] as SteamStudioKey[],
  skillTags: ["observation","measurement","planning","problem-solving","iteration","creativity","design-thinking","communication","persistence"],
  careerConnections: [
    { labelEn: "Engineering", labelVi: "Kỹ thuật" },
    { labelEn: "Architecture", labelVi: "Kiến trúc" },
    { labelEn: "Product Design", labelVi: "Thiết kế sản phẩm" },
    { labelEn: "Creative Technology", labelVi: "Công nghệ sáng tạo" },
  ],
};

export const COMMUNITY_BRIDGE_MISSIONS: Record<LearnerAgeBand, SteamMissionDefinition> = {
  "7-9": {
    ...BRIDGE_BASE,
    ageBand: "7-9",
    difficultyLabelEn: "Young Explorers",
    difficultyLabelVi: "Nhà khám phá nhỏ",
    missionPromptEn: "A stream separates two parts of a park. Build a safe bridge so families can cross. Choose pieces, test it, notice what happens, then make it better.",
    missionPromptVi: "Một con suối chia công viên thành hai phần. Hãy làm cây cầu an toàn để mọi người đi qua. Chọn các bộ phận, thử cầu, quan sát rồi cải tiến.",
    constraints: [
      { key: "span", labelEn: "Bridge length", labelVi: "Chiều dài cầu", min: 4, max: 8 },
      { key: "supports", labelEn: "Supports", labelVi: "Trụ đỡ", min: 1, max: 3 },
      { key: "material", labelEn: "Material", labelVi: "Vật liệu", options: ["wood","steel","recycled"] },
    ],
    reflectionPromptsEn: ["What changed?", "What would you try next?", "Which part are you proud of?"],
    reflectionPromptsVi: ["Điều gì đã thay đổi?", "Em muốn thử gì tiếp theo?", "Em tự hào về phần nào?"],
  },
  "10-13": {
    ...BRIDGE_BASE,
    ageBand: "10-13",
    difficultyLabelEn: "Builders",
    difficultyLabelVi: "Nhà kiến tạo",
    missionPromptEn: "Design a community bridge with a limited budget. Measure the span, choose materials and supports, test a load, then improve your design using evidence.",
    missionPromptVi: "Thiết kế cầu cộng đồng với ngân sách giới hạn. Đo nhịp cầu, chọn vật liệu và trụ đỡ, thử tải rồi cải tiến bằng minh chứng.",
    constraints: [
      { key: "span", labelEn: "Span (m)", labelVi: "Nhịp cầu (m)", min: 8, max: 20 },
      { key: "supports", labelEn: "Supports", labelVi: "Trụ đỡ", min: 1, max: 5 },
      { key: "deckWidth", labelEn: "Deck width", labelVi: "Bề rộng mặt cầu", min: 2, max: 5 },
      { key: "material", labelEn: "Material", labelVi: "Vật liệu", options: ["wood","steel","composite"] },
      { key: "budget", labelEn: "Budget points", labelVi: "Điểm ngân sách", min: 80, max: 140 },
    ],
    reflectionPromptsEn: ["What failed or flexed?", "Which change improved the bridge?", "How did the budget affect your choice?"],
    reflectionPromptsVi: ["Phần nào chưa ổn hoặc bị võng?", "Thay đổi nào giúp cầu tốt hơn?", "Ngân sách ảnh hưởng lựa chọn thế nào?"],
  },
  "14-16": {
    ...BRIDGE_BASE,
    ageBand: "14-16",
    difficultyLabelEn: "Designers & Problem Solvers",
    difficultyLabelVi: "Nhà thiết kế & giải quyết vấn đề",
    missionPromptEn: "Respond to a design brief: create a bridge that balances structural stability, cost, accessibility, environmental impact and visual identity. Validate at least two iterations.",
    missionPromptVi: "Giải một đề bài thiết kế: tạo cây cầu cân bằng độ ổn định, chi phí, khả năng tiếp cận, tác động môi trường và bản sắc thẩm mỹ. Xác thực ít nhất hai vòng cải tiến.",
    constraints: [
      { key: "span", labelEn: "Span (m)", labelVi: "Nhịp cầu (m)", min: 18, max: 45 },
      { key: "supports", labelEn: "Supports", labelVi: "Trụ đỡ", min: 1, max: 7 },
      { key: "deckWidth", labelEn: "Deck width (m)", labelVi: "Bề rộng mặt cầu (m)", min: 3, max: 9 },
      { key: "material", labelEn: "Primary material", labelVi: "Vật liệu chính", options: ["steel","reinforced-concrete","composite","timber-hybrid"] },
      { key: "accessibility", labelEn: "Accessibility features", labelVi: "Tính năng tiếp cận", min: 0, max: 3 },
      { key: "budget", labelEn: "Budget points", labelVi: "Điểm ngân sách", min: 150, max: 320 },
    ],
    reflectionPromptsEn: ["Which trade-off was hardest?", "What evidence changed your design?", "How does the bridge serve different users?"],
    reflectionPromptsVi: ["Đánh đổi nào khó nhất?", "Minh chứng nào làm bạn thay đổi thiết kế?", "Cầu phục vụ các nhóm người dùng khác nhau thế nào?"],
  },
  "17-18": {
    ...BRIDGE_BASE,
    ageBand: "17-18",
    difficultyLabelEn: "Future Creators",
    difficultyLabelVi: "Nhà sáng tạo tương lai",
    missionPromptEn: "Act as a junior design team responding to an infrastructure brief. Optimize capacity, cost, resilience, accessibility and environmental impact, document assumptions, validate multiple scenarios and present a design rationale.",
    missionPromptVi: "Đóng vai đội thiết kế trẻ giải đề bài hạ tầng. Tối ưu sức chịu tải, chi phí, độ bền, khả năng tiếp cận và tác động môi trường; ghi lại giả định, kiểm thử nhiều kịch bản và bảo vệ phương án thiết kế.",
    constraints: [
      { key: "span", labelEn: "Span (m)", labelVi: "Nhịp cầu (m)", min: 30, max: 80 },
      { key: "supports", labelEn: "Supports", labelVi: "Trụ đỡ", min: 1, max: 9 },
      { key: "deckWidth", labelEn: "Deck width (m)", labelVi: "Bề rộng mặt cầu (m)", min: 4, max: 14 },
      { key: "material", labelEn: "Primary system", labelVi: "Hệ kết cấu chính", options: ["steel-truss","cable-supported","reinforced-concrete","hybrid-composite"] },
      { key: "accessibility", labelEn: "Accessibility score", labelVi: "Điểm tiếp cận", min: 0, max: 5 },
      { key: "sustainability", labelEn: "Sustainability target", labelVi: "Mục tiêu bền vững", min: 1, max: 5 },
      { key: "budget", labelEn: "Budget points", labelVi: "Điểm ngân sách", min: 260, max: 600 },
    ],
    reflectionPromptsEn: ["Which assumption most affects your design?", "What scenario exposed the biggest weakness?", "How would you communicate the trade-off to a client or community?"],
    reflectionPromptsVi: ["Giả định nào ảnh hưởng thiết kế nhiều nhất?", "Kịch bản nào bộc lộ điểm yếu lớn nhất?", "Bạn sẽ giải thích sự đánh đổi cho khách hàng hoặc cộng đồng thế nào?"],
  },
};

export const STEAM_MISSION_PIPELINE = [
  "discover","imagine","design","build","test","observe","create","improve","explain","reflect","discover-skills","explore-careers",
] as const;

export function bridgeMissionForAge(ageBand: LearnerAgeBand) {
  return COMMUNITY_BRIDGE_MISSIONS[ageBand];
}

export function ageProfileForMission(ageBand: LearnerAgeBand) {
  return LEARNER_AGE_PROFILES[ageBand];
}
