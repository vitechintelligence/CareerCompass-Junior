export type TeacherUpskillModule = {
  key: string;
  titleEn: string;
  titleVi: string;
  focusEn: string;
  focusVi: string;
  outcomesEn: string[];
  outcomesVi: string[];
  estimatedHours: number;
  evidenceEn: string;
  evidenceVi: string;
  alignment: string[];
};

export const TEACHER_UPSKILL_MODULES: TeacherUpskillModule[] = [
  {
    key: "lesson-design-competency",
    titleEn: "Competency-based lesson design",
    titleVi: "Thiết kế bài dạy phát triển năng lực",
    focusEn: "Translate curriculum goals into observable learning outcomes, activities and evidence.",
    focusVi: "Chuyển mục tiêu chương trình thành kết quả học tập quan sát được, hoạt động và minh chứng.",
    outcomesEn: ["Write measurable outcomes", "Align activity and assessment", "Differentiate for learner needs"],
    outcomesVi: ["Viết kết quả học tập đo lường được", "Căn chỉnh hoạt động và đánh giá", "Phân hóa theo nhu cầu người học"],
    estimatedHours: 4,
    evidenceEn: "Submit one lesson plan with alignment notes.",
    evidenceVi: "Nộp một kế hoạch bài dạy kèm ghi chú căn chỉnh.",
    alignment: ["planning", "pedagogy", "professional practice"],
  },
  {
    key: "assessment-for-learning",
    titleEn: "Assessment for learning",
    titleVi: "Đánh giá vì sự tiến bộ của học sinh",
    focusEn: "Use formative checks, rubrics and feedback to improve learning rather than only record scores.",
    focusVi: "Dùng kiểm tra hình thành, rubric và phản hồi để cải thiện việc học thay vì chỉ ghi điểm.",
    outcomesEn: ["Build valid checks", "Use rubrics", "Give actionable feedback"],
    outcomesVi: ["Thiết kế kiểm tra phù hợp", "Dùng rubric", "Đưa phản hồi có thể hành động"],
    estimatedHours: 5,
    evidenceEn: "Create a quiz, rubric and feedback sample.",
    evidenceVi: "Tạo quiz, rubric và mẫu phản hồi.",
    alignment: ["assessment", "student development", "professional practice"],
  },
  {
    key: "classroom-management",
    titleEn: "Classroom management & routines",
    titleVi: "Quản lý lớp học & nề nếp",
    focusEn: "Build predictable routines, positive behavior supports, attendance habits and clear classroom roles.",
    focusVi: "Xây nề nếp ổn định, hỗ trợ hành vi tích cực, thói quen điểm danh và vai trò lớp học rõ ràng.",
    outcomesEn: ["Design routines", "Track attendance", "Respond proportionately to disruptions"],
    outcomesVi: ["Thiết kế nề nếp", "Theo dõi chuyên cần", "Xử lý gián đoạn phù hợp"],
    estimatedHours: 4,
    evidenceEn: "Create a classroom operating plan.",
    evidenceVi: "Tạo kế hoạch vận hành lớp học.",
    alignment: ["class management", "student support", "school operations"],
  },
  {
    key: "student-support-inclusive",
    titleEn: "Student support & inclusive teaching",
    titleVi: "Hỗ trợ học sinh & dạy học bao trùm",
    focusEn: "Recognize learning barriers, adapt instruction and know when to escalate support through school procedures.",
    focusVi: "Nhận biết rào cản học tập, điều chỉnh dạy học và biết khi nào cần chuyển hỗ trợ theo quy trình nhà trường.",
    outcomesEn: ["Spot barriers", "Adapt tasks", "Document and escalate appropriately"],
    outcomesVi: ["Nhận diện rào cản", "Điều chỉnh nhiệm vụ", "Ghi nhận và chuyển hỗ trợ phù hợp"],
    estimatedHours: 5,
    evidenceEn: "Complete a learner-support case plan.",
    evidenceVi: "Hoàn thành kế hoạch hỗ trợ một tình huống học sinh.",
    alignment: ["student support", "inclusion", "professional responsibility"],
  },
  {
    key: "digital-learning-lms",
    titleEn: "Digital teaching & LMS practice",
    titleVi: "Dạy học số & vận hành LMS",
    focusEn: "Organize digital materials, assignments, attendance, progress evidence and online learning routines.",
    focusVi: "Tổ chức học liệu số, bài tập, chuyên cần, minh chứng tiến độ và nề nếp học trực tuyến.",
    outcomesEn: ["Structure a digital class", "Manage resources and assignments", "Use progress data safely"],
    outcomesVi: ["Cấu trúc lớp số", "Quản lý học liệu và bài tập", "Dùng dữ liệu tiến độ an toàn"],
    estimatedHours: 5,
    evidenceEn: "Set up a complete digital classroom workflow.",
    evidenceVi: "Thiết lập quy trình lớp học số hoàn chỉnh.",
    alignment: ["digital competence", "online learning", "school operations"],
  },
  {
    key: "stem-steam-project-learning",
    titleEn: "STEM/STEAM project learning",
    titleVi: "Dạy học dự án STEM/STEAM",
    focusEn: "Facilitate inquiry, engineering design, collaboration and evidence-based reflection.",
    focusVi: "Tổ chức khám phá, thiết kế kỹ thuật, hợp tác và phản tư dựa trên minh chứng.",
    outcomesEn: ["Frame project challenges", "Facilitate iteration", "Assess process and product"],
    outcomesVi: ["Xác định thử thách dự án", "Hướng dẫn cải tiến lặp", "Đánh giá quá trình và sản phẩm"],
    estimatedHours: 6,
    evidenceEn: "Build one age-appropriate project brief and rubric.",
    evidenceVi: "Xây một đề bài dự án phù hợp lứa tuổi và rubric.",
    alignment: ["innovation", "science/technology education", "project learning"],
  },
  {
    key: "ai-literacy-for-teachers",
    titleEn: "AI literacy for teachers",
    titleVi: "Hiểu biết AI dành cho giáo viên",
    focusEn: "Use AI as an assistive tool while protecting learner data, checking outputs and keeping human accountability.",
    focusVi: "Dùng AI như công cụ hỗ trợ, đồng thời bảo vệ dữ liệu học sinh, kiểm tra đầu ra và giữ trách nhiệm của con người.",
    outcomesEn: ["Write bounded prompts", "Verify AI outputs", "Apply privacy and human-review rules"],
    outcomesVi: ["Viết prompt có giới hạn", "Xác minh đầu ra AI", "Áp dụng quy tắc riêng tư và kiểm duyệt con người"],
    estimatedHours: 5,
    evidenceEn: "Create a safe AI-assisted lesson workflow and evaluation checklist.",
    evidenceVi: "Tạo quy trình bài dạy có AI hỗ trợ an toàn và checklist đánh giá.",
    alignment: ["digital competence", "innovation", "professional responsibility"],
  },
  {
    key: "data-informed-teaching",
    titleEn: "Data-informed teaching",
    titleVi: "Dạy học dựa trên dữ liệu",
    focusEn: "Interpret attendance, assessment and progress patterns without reducing learners to a single score.",
    focusVi: "Diễn giải mẫu chuyên cần, đánh giá và tiến độ mà không quy học sinh về một điểm số duy nhất.",
    outcomesEn: ["Read simple dashboards", "Identify patterns", "Plan targeted follow-up"],
    outcomesVi: ["Đọc dashboard đơn giản", "Nhận diện mẫu", "Lập kế hoạch hỗ trợ có mục tiêu"],
    estimatedHours: 4,
    evidenceEn: "Produce a class action plan from a sample dashboard.",
    evidenceVi: "Tạo kế hoạch hành động lớp từ dashboard mẫu.",
    alignment: ["assessment", "student support", "school improvement"],
  },
  {
    key: "parent-community-communication",
    titleEn: "Family & community communication",
    titleVi: "Giao tiếp với gia đình & cộng đồng",
    focusEn: "Communicate progress, expectations and support needs clearly and respectfully.",
    focusVi: "Giao tiếp rõ ràng, tôn trọng về tiến độ, kỳ vọng và nhu cầu hỗ trợ.",
    outcomesEn: ["Write clear updates", "Handle difficult conversations", "Document follow-up"],
    outcomesVi: ["Viết cập nhật rõ ràng", "Xử lý trao đổi khó", "Ghi nhận việc theo dõi"],
    estimatedHours: 4,
    evidenceEn: "Create three parent/community communication templates.",
    evidenceVi: "Tạo ba mẫu giao tiếp phụ huynh/cộng đồng.",
    alignment: ["school-family-community", "professional communication", "student support"],
  },
  {
    key: "teacher-reflection-portfolio",
    titleEn: "Professional reflection & evidence portfolio",
    titleVi: "Phản tư nghề nghiệp & hồ sơ minh chứng",
    focusEn: "Use evidence from teaching, learner work and professional learning to plan next-step growth.",
    focusVi: "Dùng minh chứng từ dạy học, sản phẩm học sinh và bồi dưỡng để lập kế hoạch phát triển tiếp theo.",
    outcomesEn: ["Collect relevant evidence", "Reflect against goals", "Plan a development cycle"],
    outcomesVi: ["Thu thập minh chứng phù hợp", "Phản tư theo mục tiêu", "Lập chu kỳ phát triển"],
    estimatedHours: 3,
    evidenceEn: "Create a professional growth portfolio page.",
    evidenceVi: "Tạo một trang portfolio phát triển nghề nghiệp.",
    alignment: ["continuous professional development", "reflection", "professional standards"],
  },
];

export const TEACHER_UPSKILL_NOTICE_EN =
  "These modules support professional growth and school practice. They do not by themselves replace any officially required qualification, certificate or approved training program.";
export const TEACHER_UPSKILL_NOTICE_VI =
  "Các mô-đun này hỗ trợ phát triển nghề nghiệp và thực hành tại trường. Chúng không tự động thay thế bằng cấp, chứng chỉ hoặc chương trình bồi dưỡng chính thức theo quy định.";
