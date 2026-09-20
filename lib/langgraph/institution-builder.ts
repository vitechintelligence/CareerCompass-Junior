import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { defaultFeaturesForOrganization, sanitizeFeatureKeys } from "@/lib/platform-feature-catalog";

export type InstitutionBuildInput = {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  organizationSemanticId: string;
  locale: "vi" | "en";
  requestedFeatures: string[];
};

const InstitutionBuildState = Annotation.Root({
  organizationId: Annotation<string>,
  organizationName: Annotation<string>,
  organizationType: Annotation<string>,
  organizationSemanticId: Annotation<string>,
  locale: Annotation<"vi" | "en">,
  requestedFeatures: Annotation<string[]>,
  featurePlan: Annotation<string[]>,
  complianceProfile: Annotation<Record<string, unknown>>,
  intelligenceProfile: Annotation<Record<string, unknown>>,
  slug: Annotation<string>,
  pageTitle: Annotation<string>,
  pageHeadline: Annotation<string>,
  pageSummary: Annotation<string>,
  modules: Annotation<Record<string, unknown>>,
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function scopeFeatures(state: typeof InstitutionBuildState.State) {
  const requested = sanitizeFeatureKeys(state.requestedFeatures || []);
  const defaults = defaultFeaturesForOrganization(state.organizationType);
  const featurePlan = requested.length ? requested : defaults;

  const required = ["lms_core", "data_privacy_controls", "audit_events", "localization"];
  return { featurePlan: Array.from(new Set([...featurePlan, ...required])) };
}

function applyVietnamEducationGuardrails(state: typeof InstitutionBuildState.State) {
  const schoolLike = ["school", "training_center"].includes(state.organizationType);
  return {
    complianceProfile: {
      jurisdiction: "VN",
      mode: "controls-not-legal-certification",
      schoolLike,
      childDataMinimization: true,
      guardianAndLearnerConsentSupport: schoolLike,
      roleBasedAccess: true,
      auditTrail: true,
      retentionControls: true,
      noGovernmentIdRequired: true,
      noSensitiveLearnerProfilingByDefault: true,
      humanControlledPublishing: true,
    },
  };
}

function configureIntelligence(state: typeof InstitutionBuildState.State) {
  const enabled = new Set(state.featurePlan || []);
  return {
    intelligenceProfile: {
      mode: "assistive",
      humanApprovalRequired: true,
      provider: "unconfigured",
      capabilities: {
        search: enabled.has("intelligence_search"),
        summarize: enabled.has("intelligence_summary"),
        recommend: enabled.has("intelligence_recommendations"),
      },
      restrictions: [
        "no autonomous high-stakes grading",
        "no sensitive-trait inference",
        "no automatic staff or learner role elevation",
        "no public publishing without administrator action",
      ],
    },
  };
}

function composeWhiteLabelPage(state: typeof InstitutionBuildState.State) {
  const suffix = state.organizationId.replaceAll("-", "").slice(0, 6);
  const slug = `${slugify(state.organizationName) || "institution"}-${suffix}`;
  const vi = state.locale === "vi";
  return {
    slug,
    pageTitle: state.organizationName,
    pageHeadline: vi ? "Không gian học tập và vận hành của tổ chức" : "Institution learning + operations workspace",
    pageSummary: vi
      ? "Một không gian được ViTech cấp quyền theo mô-đun cho học tập, giáo viên, quản trị, tự động hóa và lớp trí tuệ hỗ trợ."
      : "A ViTech-provisioned workspace with administrator-controlled learning, teacher, operations, automation and intelligence modules.",
    modules: {
      featurePlan: state.featurePlan,
      sections: [
        "learning",
        "teacher-delivery",
        "operations",
        "workflow-automation",
        "intelligence",
        "security-continuity",
        "integrations",
        "localization",
      ],
    },
  };
}

export const institutionBuilderGraph = new StateGraph(InstitutionBuildState)
  .addNode("scope_features", scopeFeatures)
  .addNode("vn_compliance_guardrails", applyVietnamEducationGuardrails)
  .addNode("intelligence_layer", configureIntelligence)
  .addNode("compose_white_label", composeWhiteLabelPage)
  .addEdge(START, "scope_features")
  .addEdge("scope_features", "vn_compliance_guardrails")
  .addEdge("vn_compliance_guardrails", "intelligence_layer")
  .addEdge("intelligence_layer", "compose_white_label")
  .addEdge("compose_white_label", END)
  .compile();

export async function buildInstitutionPlan(input: InstitutionBuildInput) {
  return institutionBuilderGraph.invoke(input, {
    tags: ["institution-builder", "admin-controlled"],
    metadata: {
      organizationId: input.organizationId,
      organizationType: input.organizationType,
      locale: input.locale,
      containsStudentContent: false,
    },
  });
}
