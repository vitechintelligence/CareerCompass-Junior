export type Locale = "en" | "vi";
export type PortalRole = "student" | "teacher" | "partner";

export type PortalMetric = {
  label: { en: string; vi: string };
  value: string;
  detail: { en: string; vi: string };
};

export type PortalAction = {
  title: { en: string; vi: string };
  description: { en: string; vi: string };
  href: string;
};

export const portalCopy: Record<PortalRole, {
  eyebrow: { en: string; vi: string };
  title: { en: string; vi: string };
  description: { en: string; vi: string };
  metrics: PortalMetric[];
  actions: PortalAction[];
}> = {
  student: {
    eyebrow: { en: "My learning journey", vi: "Hành trình học tập của em" },
    title: { en: "Student Portal", vi: "Cổng học sinh" },
    description: {
      en: "Learn from interactive Career Compass Junior books, complete activities, build evidence and see progress clearly.",
      vi: "Học với sách Career Compass Junior tương tác, hoàn thành hoạt động, lưu minh chứng và theo dõi tiến bộ rõ ràng."
    },
    metrics: [
      { label: { en: "Book progress", vi: "Tiến độ sách" }, value: "42%", detail: { en: "6 units active", vi: "6 bài đang học" } },
      { label: { en: "Learning streak", vi: "Chuỗi học tập" }, value: "8 days", detail: { en: "Keep going", vi: "Tiếp tục nhé" } },
      { label: { en: "Evidence saved", vi: "Minh chứng đã lưu" }, value: "18", detail: { en: "In learning capsule", vi: "Trong hồ sơ học tập" } }
    ],
    actions: [
      { title: { en: "Continue my book", vi: "Tiếp tục sách của em" }, description: { en: "Resume the next interactive lesson.", vi: "Tiếp tục bài học tương tác tiếp theo." }, href: "#learning" },
      { title: { en: "Practice English", vi: "Luyện tiếng Anh" }, description: { en: "Speaking, listening and vocabulary activities.", vi: "Hoạt động nói, nghe và từ vựng." }, href: "#activities" },
      { title: { en: "My achievements", vi: "Thành tích của em" }, description: { en: "View teacher feedback and verified evidence.", vi: "Xem nhận xét giáo viên và minh chứng đã xác nhận." }, href: "#evidence" }
    ]
  },
  teacher: {
    eyebrow: { en: "Teach with clarity", vi: "Giảng dạy rõ ràng, dễ quản lý" },
    title: { en: "Teacher Portal", vi: "Cổng giáo viên" },
    description: {
      en: "Plan classes, assign interactive book work, record attendance, review submissions and give structured feedback.",
      vi: "Lập kế hoạch lớp, giao bài từ sách tương tác, điểm danh, chấm bài và phản hồi có cấu trúc."
    },
    metrics: [
      { label: { en: "Active classes", vi: "Lớp đang dạy" }, value: "4", detail: { en: "68 learners", vi: "68 học sinh" } },
      { label: { en: "Needs review", vi: "Cần chấm" }, value: "12", detail: { en: "Submissions", vi: "Bài nộp" } },
      { label: { en: "Attendance", vi: "Chuyên cần" }, value: "94%", detail: { en: "This month", vi: "Tháng này" } }
    ],
    actions: [
      { title: { en: "Open class workspace", vi: "Mở không gian lớp" }, description: { en: "Roster, attendance and lesson focus.", vi: "Danh sách lớp, điểm danh và nội dung buổi học." }, href: "#classes" },
      { title: { en: "Assign activities", vi: "Giao hoạt động" }, description: { en: "Choose book units and interactive tasks.", vi: "Chọn bài trong sách và hoạt động tương tác." }, href: "#assignments" },
      { title: { en: "Review evidence", vi: "Duyệt minh chứng" }, description: { en: "Give feedback and approve learning evidence.", vi: "Phản hồi và xác nhận minh chứng học tập." }, href: "#evidence" }
    ]
  },
  partner: {
    eyebrow: { en: "One place for your program", vi: "Một nơi quản lý toàn bộ chương trình" },
    title: { en: "Partner Portal", vi: "Cổng đối tác" },
    description: {
      en: "Schools and training centers can manage teachers, students, classes, program delivery, resources, payments and reporting.",
      vi: "Trường học và trung tâm quản lý giáo viên, học sinh, lớp học, triển khai chương trình, tài nguyên, thanh toán và báo cáo."
    },
    metrics: [
      { label: { en: "Students", vi: "Học sinh" }, value: "126", detail: { en: "Across 7 classes", vi: "Trong 7 lớp" } },
      { label: { en: "Teachers", vi: "Giáo viên" }, value: "9", detail: { en: "8 assigned", vi: "8 đã được phân lớp" } },
      { label: { en: "Program completion", vi: "Hoàn thành chương trình" }, value: "61%", detail: { en: "Current cycle", vi: "Chu kỳ hiện tại" } }
    ],
    actions: [
      { title: { en: "Manage people", vi: "Quản lý người dùng" }, description: { en: "Controlled student credentials and teacher access.", vi: "Thông tin đăng nhập học sinh được kiểm soát và quyền giáo viên." }, href: "#people" },
      { title: { en: "Manage classes", vi: "Quản lý lớp" }, description: { en: "Memberships, teacher assignments and enrollments.", vi: "Thành viên lớp, phân công giáo viên và ghi danh." }, href: "#classes" },
      { title: { en: "Program intelligence", vi: "Dữ liệu chương trình" }, description: { en: "Progress, attendance, evidence and delivery health.", vi: "Tiến độ, chuyên cần, minh chứng và sức khỏe triển khai." }, href: "#reporting" }
    ]
  }
};

export const bookUnits = [
  { code: "U01", en: "Who Am I?", vi: "Em là ai?", focus: "Identity + simple English introductions", progress: 100 },
  { code: "U02", en: "My Strengths", vi: "Điểm mạnh của em", focus: "Strengths vocabulary + speaking", progress: 78 },
  { code: "U03", en: "How I Learn", vi: "Cách em học", focus: "Learning habits + reflection", progress: 44 },
  { code: "U04", en: "People & Work", vi: "Con người và nghề nghiệp", focus: "Career awareness + question forms", progress: 10 }
];

export const t = (value: { en: string; vi: string }, locale: Locale) => value[locale];
