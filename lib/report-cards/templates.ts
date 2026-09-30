export type ReportCardField = {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "select" | "signature" | "table" | "photo";
  required?: boolean;
  options?: string[];
  columns?: Array<{ key: string; label: string }>;
};

export type ReportCardSection = {
  key: string;
  title: string;
  fields: ReportCardField[];
};

export type ReportCardTemplateSchema = {
  templateKey: string;
  countryCode: string;
  educationLevel: string;
  language: string[];
  pageSize: "A4";
  orientation: "portrait" | "landscape";
  title: string;
  subtitle?: string;
  sourceNote: string;
  sections: ReportCardSection[];
};

const IDENTITY_FIELDS: ReportCardField[] = [
  { key: "student_name", label: "Họ và tên học sinh", type: "text", required: true },
  { key: "gender", label: "Giới tính", type: "text" },
  { key: "date_of_birth", label: "Ngày, tháng, năm sinh", type: "date" },
  { key: "place_of_birth", label: "Nơi sinh", type: "text" },
  { key: "ethnicity", label: "Dân tộc", type: "text" },
  { key: "current_residence", label: "Nơi ở hiện nay", type: "text" },
  { key: "father_guardian", label: "Họ tên cha/người giám hộ", type: "text" },
  { key: "father_occupation", label: "Nghề nghiệp", type: "text" },
  { key: "mother_guardian", label: "Họ tên mẹ/người giám hộ", type: "text" },
  { key: "mother_occupation", label: "Nghề nghiệp", type: "text" },
];

const YEAR_RESULT_COLUMNS = [
  { key: "semester_1", label: "Học kỳ I" },
  { key: "semester_2", label: "Học kỳ II" },
  { key: "year_result", label: "Cả năm" },
  { key: "reassessment", label: "Đánh giá lại" },
];

export const VIETNAM_PRIMARY_REPORT_CARD: ReportCardTemplateSchema = {
  templateKey: "vn-primary-current",
  countryCode: "VN",
  educationLevel: "primary",
  language: ["vi"],
  pageSize: "A4",
  orientation: "portrait",
  title: "HỌC BẠ TIỂU HỌC",
  sourceNote: "Starting structure based on the current Vietnamese primary-school report-card model. The school remains responsible for confirming the current mandated form and local instructions before activation.",
  sections: [
    {
      key: "cover",
      title: "Thông tin học sinh và nhà trường",
      fields: [
        { key: "school_name", label: "Trường", type: "text", required: true },
        { key: "district_province", label: "Quận/Huyện/Tỉnh/Thành phố", type: "text" },
        ...IDENTITY_FIELDS,
        { key: "student_code", label: "Mã số học sinh", type: "text" },
        { key: "photo", label: "Ảnh học sinh", type: "photo" },
      ],
    },
    {
      key: "subjects",
      title: "Kết quả học tập các môn học và hoạt động giáo dục",
      fields: [{
        key: "subject_results",
        label: "Môn học/Hoạt động giáo dục",
        type: "table",
        columns: [
          { key: "subject", label: "Môn học/Hoạt động giáo dục" },
          { key: "achievement_level", label: "Mức đạt được" },
          { key: "periodic_score", label: "Điểm kiểm tra định kỳ" },
          { key: "comment", label: "Nhận xét" },
        ],
      }],
    },
    {
      key: "competencies",
      title: "Năng lực và phẩm chất",
      fields: [
        { key: "core_competencies", label: "Năng lực cốt lõi", type: "table", columns: [{ key: "competency", label: "Năng lực" }, { key: "level", label: "Mức đạt được" }, { key: "comment", label: "Nhận xét" }] },
        { key: "core_qualities", label: "Phẩm chất chủ yếu", type: "table", columns: [{ key: "quality", label: "Phẩm chất" }, { key: "level", label: "Mức đạt được" }, { key: "comment", label: "Nhận xét" }] },
      ],
    },
    {
      key: "year_end",
      title: "Tổng hợp cuối năm",
      fields: [
        { key: "completed_program", label: "Hoàn thành chương trình lớp học/chương trình tiểu học", type: "select", options: ["Có", "Chưa"] },
        { key: "awards", label: "Khen thưởng/Thành tích", type: "text" },
        { key: "homeroom_comment", label: "Nhận xét của giáo viên chủ nhiệm", type: "text" },
        { key: "homeroom_signature", label: "Giáo viên chủ nhiệm", type: "signature" },
        { key: "principal_signature", label: "Hiệu trưởng", type: "signature" },
      ],
    },
  ],
};

function secondaryTemplate(level: "lower_secondary" | "upper_secondary"): ReportCardTemplateSchema {
  const upper = level === "upper_secondary";
  return {
    templateKey: upper ? "vn-thpt-current" : "vn-thcs-current",
    countryCode: "VN",
    educationLevel: level,
    language: ["vi"],
    pageSize: "A4",
    orientation: "portrait",
    title: upper ? "HỌC BẠ TRUNG HỌC PHỔ THÔNG" : "HỌC BẠ TRUNG HỌC CƠ SỞ",
    sourceNote: "Starting structure follows the current Vietnamese secondary-school digital report-card layout. The school must confirm the current mandated form, subject configuration and local instructions before activation.",
    sections: [
      {
        key: "cover",
        title: "Bìa và thông tin học sinh",
        fields: [
          { key: "province", label: "Tỉnh/Thành phố", type: "text" },
          { key: "school_name", label: "Trường", type: "text", required: true },
          { key: "register_number", label: "Số đăng bộ", type: "text" },
          ...IDENTITY_FIELDS,
          { key: "guardian_other", label: "Người giám hộ khác (nếu có)", type: "text" },
          { key: "principal_initial_signature", label: "Hiệu trưởng xác nhận thông tin", type: "signature" },
          { key: "photo", label: "Ảnh học sinh", type: "photo" },
        ],
      },
      {
        key: "school_history",
        title: "Quá trình học tập",
        fields: [{
          key: "school_year_history",
          label: "Năm học/Lớp/Trường",
          type: "table",
          columns: [
            { key: "school_year", label: "Năm học" },
            { key: "grade", label: "Lớp" },
            { key: "school", label: "Trường" },
            { key: "province", label: "Tỉnh/Thành phố" },
          ],
        }],
      },
      {
        key: "subject_results",
        title: "Kết quả học tập",
        fields: [{
          key: "subjects",
          label: "Môn học",
          type: "table",
          columns: [{ key: "subject", label: "Môn học/Hoạt động giáo dục" }, ...YEAR_RESULT_COLUMNS, { key: "comment_signature", label: "Nhận xét/Ký xác nhận" }],
        }],
      },
      {
        key: "training_learning",
        title: "Kết quả rèn luyện và học tập",
        fields: [
          { key: "training_result", label: "Kết quả rèn luyện", type: "table", columns: YEAR_RESULT_COLUMNS },
          { key: "learning_result", label: "Kết quả học tập", type: "table", columns: YEAR_RESULT_COLUMNS },
          { key: "absence_days", label: "Tổng số ngày nghỉ học", type: "number" },
          { key: "promotion_result", label: "Được lên lớp/Không được lên lớp", type: "text" },
          ...(upper ? [{ key: "graduation_completion", label: "Hoàn thành chương trình/Thông tin tốt nghiệp", type: "text" as const }] : []),
        ],
      },
      {
        key: "recognition",
        title: "Thành tích và xác nhận",
        fields: [
          { key: "certificates", label: "Chứng chỉ/Chứng nhận", type: "text" },
          { key: "competitions", label: "Thành tích thi/hoạt động", type: "text" },
          { key: "awards", label: "Khen thưởng", type: "text" },
          { key: "summer_training", label: "Kết quả rèn luyện trong hè (nếu có)", type: "text" },
          { key: "homeroom_comment", label: "Nhận xét của giáo viên chủ nhiệm", type: "text" },
          { key: "homeroom_signature", label: "Giáo viên chủ nhiệm", type: "signature" },
          { key: "principal_signature", label: "Hiệu trưởng", type: "signature" },
        ],
      },
    ],
  };
}

export const VIETNAM_LOWER_SECONDARY_REPORT_CARD = secondaryTemplate("lower_secondary");
export const VIETNAM_UPPER_SECONDARY_REPORT_CARD = secondaryTemplate("upper_secondary");

export const VITECH_BLANK_REPORT_CARD: ReportCardTemplateSchema = {
  templateKey: "vitech-blank",
  countryCode: "CUSTOM",
  educationLevel: "custom",
  language: ["en"],
  pageSize: "A4",
  orientation: "portrait",
  title: "Student Report",
  sourceNote: "ViTech neutral starting template. Institution approval is required before use as an official school report.",
  sections: [
    { key: "identity", title: "Student", fields: [{ key: "student_name", label: "Student name", type: "text", required: true }, { key: "student_id", label: "Student ID", type: "text" }] },
    { key: "results", title: "Results", fields: [{ key: "results", label: "Learning results", type: "table", columns: [{ key: "subject", label: "Subject" }, { key: "result", label: "Result" }, { key: "comment", label: "Comment" }] }] },
    { key: "signatures", title: "Approval", fields: [{ key: "teacher_signature", label: "Teacher", type: "signature" }, { key: "school_signature", label: "School administrator", type: "signature" }] },
  ],
};

export function reportCardPreset(countryCode: string, educationLevel: string) {
  if (countryCode.toUpperCase() === "VN") {
    if (educationLevel === "primary") return VIETNAM_PRIMARY_REPORT_CARD;
    if (educationLevel === "lower_secondary") return VIETNAM_LOWER_SECONDARY_REPORT_CARD;
    if (educationLevel === "upper_secondary") return VIETNAM_UPPER_SECONDARY_REPORT_CARD;
  }
  return {
    ...VITECH_BLANK_REPORT_CARD,
    templateKey: (countryCode || "custom").toLowerCase() + "-" + (educationLevel || "custom"),
    countryCode: (countryCode || "CUSTOM").toUpperCase(),
    educationLevel: educationLevel || "custom",
    title: "Institution Report Card",
    sourceNote: "Flexible starter for institution customization. It is not claimed as an official government form until the institution supplies/approves its mandated template.",
  };
}
