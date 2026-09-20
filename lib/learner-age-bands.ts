export type LearnerAgeBand = "7-9" | "10-13" | "14-16" | "17-18";

export type LearnerAgeProfile = {
  key: LearnerAgeBand;
  ageLabelEn: string;
  ageLabelVi: string;
  gradeLabelEn: string;
  gradeLabelVi: string;
  experienceNameEn: string;
  experienceNameVi: string;
  languageEn: string;
  languageVi: string;
  scaffoldingEn: string[];
  scaffoldingVi: string[];
  evidenceDepth: "guided" | "structured" | "analytical" | "portfolio";
  maxTeamSize: number;
};

export const LEARNER_AGE_PROFILES: Record<LearnerAgeBand, LearnerAgeProfile> = {
  "7-9": {
    key: "7-9",
    ageLabelEn: "Ages 7–9",
    ageLabelVi: "7–9 tuổi",
    gradeLabelEn: "Approx. Grades 1–3",
    gradeLabelVi: "Khoảng lớp 1–3",
    experienceNameEn: "Young Explorers",
    experienceNameVi: "Nhà khám phá nhỏ",
    languageEn: "Very short instructions, concrete words, icons, audio prompts and one action at a time.",
    languageVi: "Hướng dẫn rất ngắn, từ cụ thể, nhiều biểu tượng, âm thanh và từng hành động một.",
    scaffoldingEn: ["visual choices", "read-aloud support", "drag/tap actions", "adult/teacher prompts", "short reflection"],
    scaffoldingVi: ["lựa chọn trực quan", "hỗ trợ đọc thành tiếng", "kéo/chạm", "gợi ý từ giáo viên", "phản tư ngắn"],
    evidenceDepth: "guided",
    maxTeamSize: 4,
  },
  "10-13": {
    key: "10-13",
    ageLabelEn: "Ages 10–13",
    ageLabelVi: "10–13 tuổi",
    gradeLabelEn: "Approx. Grades 4–6",
    gradeLabelVi: "Khoảng lớp 4–6",
    experienceNameEn: "Builders",
    experienceNameVi: "Nhà kiến tạo",
    languageEn: "Short explanations, guided measurement, simple cause-and-effect reasoning and supported English communication.",
    languageVi: "Giải thích ngắn, đo lường có hướng dẫn, suy luận nguyên nhân–kết quả đơn giản và giao tiếp tiếng Anh có hỗ trợ.",
    scaffoldingEn: ["guided planning", "simple data", "role cards", "sentence frames", "compare attempt 1 vs attempt 2"],
    scaffoldingVi: ["lập kế hoạch có hướng dẫn", "dữ liệu đơn giản", "thẻ vai trò", "khung câu", "so sánh lần thử 1 và 2"],
    evidenceDepth: "structured",
    maxTeamSize: 5,
  },
  "14-16": {
    key: "14-16",
    ageLabelEn: "Ages 14–16",
    ageLabelVi: "14–16 tuổi",
    gradeLabelEn: "Approx. Grades 7–10",
    gradeLabelVi: "Khoảng lớp 7–10",
    experienceNameEn: "Designers & Problem Solvers",
    experienceNameVi: "Nhà thiết kế & giải quyết vấn đề",
    languageEn: "Technical vocabulary, trade-offs, data interpretation, design rationale and structured presentation.",
    languageVi: "Từ vựng kỹ thuật, đánh đổi, đọc dữ liệu, lý do thiết kế và trình bày có cấu trúc.",
    scaffoldingEn: ["design briefs", "constraints", "team roles", "test evidence", "technical explanation"],
    scaffoldingVi: ["đề bài thiết kế", "ràng buộc", "vai trò nhóm", "minh chứng thử nghiệm", "giải thích kỹ thuật"],
    evidenceDepth: "analytical",
    maxTeamSize: 6,
  },
  "17-18": {
    key: "17-18",
    ageLabelEn: "Ages 17–18",
    ageLabelVi: "17–18 tuổi",
    gradeLabelEn: "Approx. Grades 11–12",
    gradeLabelVi: "Khoảng lớp 11–12",
    experienceNameEn: "Future Creators",
    experienceNameVi: "Nhà sáng tạo tương lai",
    languageEn: "Industry-style briefs, system constraints, validation, portfolio evidence, technical English and career-facing presentation.",
    languageVi: "Đề bài theo phong cách ngành nghề, ràng buộc hệ thống, xác thực, minh chứng portfolio, tiếng Anh kỹ thuật và thuyết trình định hướng nghề nghiệp.",
    scaffoldingEn: ["industry brief", "research notes", "validation criteria", "portfolio evidence", "peer/advisor review"],
    scaffoldingVi: ["đề bài ngành nghề", "ghi chú nghiên cứu", "tiêu chí xác thực", "minh chứng portfolio", "phản biện từ bạn/cố vấn"],
    evidenceDepth: "portfolio",
    maxTeamSize: 8,
  },
};

export const LEARNER_AGE_BANDS = Object.keys(LEARNER_AGE_PROFILES) as LearnerAgeBand[];

export function isLearnerAgeBand(value: string): value is LearnerAgeBand {
  return LEARNER_AGE_BANDS.includes(value as LearnerAgeBand);
}
