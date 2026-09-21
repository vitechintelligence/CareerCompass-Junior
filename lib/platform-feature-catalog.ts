export type PlatformFeatureCategory =
  | "learning"
  | "operations"
  | "intelligence"
  | "compliance"
  | "future_skills"
  | "teacher"
  | "ecosystem";

export type PlatformFeatureDefinition = {
  key: string;
  label: string;
  description: string;
  category: PlatformFeatureCategory;
  essential?: boolean;
};

export const PLATFORM_FEATURES: PlatformFeatureDefinition[] = [
  { key: "lms_core", label: "LMS core", description: "Organizations, classes, enrollments and role-based access.", category: "learning", essential: true },
  { key: "student_workspace", label: "Student workspace", description: "Learner dashboard, progress, activities and evidence.", category: "learning", essential: true },
  { key: "teacher_workspace", label: "Teacher workspace", description: "Class delivery, attendance, assignments, submissions and feedback.", category: "learning", essential: true },
  { key: "partner_workspace", label: "Partner workspace", description: "School or center administration across teachers, learners and classes.", category: "operations", essential: true },
  { key: "interactive_books", label: "Interactive books", description: "Digital companion activities linked to Career Compass Junior books.", category: "learning", essential: true },
  { key: "attendance", label: "Attendance", description: "Session attendance with controlled teacher recording.", category: "operations", essential: true },
  { key: "assignments_feedback", label: "Assignments + feedback", description: "Assignment publishing, learner submissions and teacher feedback.", category: "learning", essential: true },
  { key: "progress_reporting", label: "Progress reporting", description: "Unit progress, attempts, completion and actionable delivery views.", category: "operations", essential: true },
  { key: "parent_reporting", label: "Parent reporting", description: "Institution-controlled progress summaries for guardians.", category: "operations" },
  { key: "announcements", label: "Announcements", description: "Organization and class announcements by audience.", category: "operations" },
  { key: "resources", label: "Resources", description: "Teacher guides, printables, documents, audio, video and links.", category: "learning", essential: true },
  { key: "payments", label: "Payments", description: "Payment status records and institution-level visibility.", category: "operations" },
  { key: "mobile_pwa", label: "Mobile PWA", description: "Installable mobile-first experience without a separate native codebase.", category: "operations", essential: true },
  { key: "localization", label: "Localization", description: "Vietnamese/English interface and organization-specific settings.", category: "operations", essential: true },
  { key: "integrations", label: "Integrations", description: "Controlled API-ready adapters for external services.", category: "operations" },
  { key: "workflow_automation", label: "Workflow automation", description: "Admin-approved triggers, assignments, handoffs and exception routing.", category: "operations", essential: true },
  { key: "learning_capsules", label: "Learning capsules", description: "Metadata-first learning evidence with controlled sharing.", category: "learning", essential: true },
  { key: "data_privacy_controls", label: "Privacy controls", description: "Data minimization, consent records, retention and access boundaries.", category: "compliance", essential: true },
  { key: "audit_events", label: "Audit events", description: "Administrative action trail for provisioning and feature changes.", category: "compliance", essential: true },
  { key: "intelligence_search", label: "Intelligence: search", description: "Context-aware search over allowed institutional content.", category: "intelligence" },
  { key: "intelligence_summary", label: "Intelligence: summarize", description: "Human-reviewed summaries of permitted learning and operational signals.", category: "intelligence" },
  { key: "intelligence_recommendations", label: "Intelligence: recommendations", description: "Assistive recommendations with administrator/teacher control.", category: "intelligence" },

  { key: "program_stem", label: "Legacy STEM curriculum metadata", description: "Compatibility flag for earlier STEM pathway metadata. New learner-facing experiential delivery should use STEAM Lab.", category: "future_skills" },
  { key: "program_steam", label: "STEAM Lab", description: "First-class experiential missions combining science, technology, engineering, arts and mathematics through design, testing, iteration and reflection.", category: "future_skills" },
  { key: "community_challenges", label: "Community challenges", description: "School-controlled quarterly individual, small-group and large-group STEAM builds with advisor feedback and showcases.", category: "future_skills" },
  { key: "institution_data_modes", label: "Institution data + AI modes", description: "Partner controls for school-managed evidence, VNG localization requests, BYOK, local-browser and manual workflows.", category: "compliance" },
  { key: "program_ai_foundation", label: "AI Foundations", description: "Age-appropriate AI literacy, data, model thinking, safety and responsible use.", category: "future_skills" },
  { key: "program_ai_level_2", label: "AI Level 2", description: "AI systems, prompting, retrieval, agents, evaluation and guarded deployment progression.", category: "future_skills" },
  { key: "program_robotics", label: "Robotics", description: "Robotics progression from sequences and sensors to control systems and autonomous machines.", category: "future_skills" },

  { key: "teacher_my_classroom", label: "Teacher: My Classroom", description: "A separate teacher-managed classroom area for school subjects outside ViTech programs.", category: "teacher", essential: true },
  { key: "assessment_engine", label: "Teacher: quizzes & exams", description: "Teacher-created quizzes, exams, student attempts, auto-scoring and review.", category: "teacher", essential: true },
  { key: "teacher_upskilling", label: "Teacher: professional learning", description: "Structured upskilling aligned to practical teaching, assessment, digital learning and innovation needs.", category: "teacher", essential: true },
  { key: "teacher_dashboard_plus", label: "Teacher: command dashboard", description: "Quick view of classes, attendance, assessments, submissions, professional learning and integrations.", category: "teacher", essential: true },

  { key: "industry_connector", label: "VinaSkillTrust Junior · School ↔ Company", description: "Grade 11–12-only school-company introductions, verified role intelligence and ViTech-moderated age-appropriate work simulations.", category: "ecosystem" },
  { key: "vinaskilltrust_services", label: "VinaSkillTrust services", description: "Partner access to verification, Studio work simulations and capability-development services.", category: "ecosystem" },
  { key: "custom_integration_requests", label: "Custom integration requests", description: "Institutions can request a new third-party app or module connection for ViTech review.", category: "ecosystem" },
];

export const PLATFORM_FEATURE_KEYS = new Set(PLATFORM_FEATURES.map((feature) => feature.key));

export function defaultFeaturesForOrganization(organizationType: string) {
  const base = PLATFORM_FEATURES.filter((feature) => feature.essential).map((feature) => feature.key);
  const optional =
    organizationType === "school"
      ? ["parent_reporting", "announcements", "integrations", "industry_connector", "vinaskilltrust_services", "custom_integration_requests", "program_steam", "community_challenges", "institution_data_modes", "program_ai_foundation", "program_robotics", "intelligence_search", "intelligence_summary"]
      : ["payments", "announcements", "integrations", "industry_connector", "vinaskilltrust_services", "custom_integration_requests", "program_steam", "community_challenges", "institution_data_modes", "program_ai_foundation", "program_robotics", "intelligence_search", "intelligence_summary", "intelligence_recommendations"];
  return Array.from(new Set([...base, ...optional]));
}

export function sanitizeFeatureKeys(keys: string[]) {
  return Array.from(new Set(keys.filter((key) => PLATFORM_FEATURE_KEYS.has(key))));
}

export function featureLabel(key: string) {
  return PLATFORM_FEATURES.find((feature) => feature.key === key)?.label ?? key;
}
