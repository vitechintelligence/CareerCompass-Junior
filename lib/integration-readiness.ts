export type ConnectorReadinessStage =
  | "canonical_contract"
  | "dedicated_normalizer"
  | "standard_transport"
  | "provider_authorization"
  | "live_verified";

export type ConnectorReadiness = {
  stage: ConnectorReadinessStage;
  label: string;
  summary: string;
  missing: string[];
};

const READY: Record<string, ConnectorReadiness> = {
  "google-classroom": {
    stage: "dedicated_normalizer",
    label: "Adapter ready · transport pending",
    summary: "Google Classroom people, classes and enrollments normalize into the Career Compass contract.",
    missing: ["Google OAuth consent flow", "Classroom API sync worker", "external identity linking", "live school tenant verification"],
  },
  "microsoft-teams-edu": {
    stage: "dedicated_normalizer",
    label: "Adapter ready · transport pending",
    summary: "Microsoft Education roster objects normalize into the Career Compass contract.",
    missing: ["Microsoft Entra consent flow", "Graph Education API worker", "external identity linking", "live education tenant verification"],
  },
  "oneroster": {
    stage: "dedicated_normalizer",
    label: "Adapter ready · transport pending",
    summary: "OneRoster users, classes and enrollments normalize into the Career Compass contract.",
    missing: ["OneRoster OAuth/client-credentials transport", "pagination and delta sync", "CSV ingestion path", "live SIS verification"],
  },
  "canvas": {
    stage: "standard_transport",
    label: "Standard selected · LTI runtime pending",
    summary: "Canvas has a clear LTI 1.3 / LTI Advantage path, but Career Compass does not yet expose the required LTI runtime endpoints.",
    missing: ["OIDC login initiation", "JWT/JWKS validation", "LTI resource launch", "Deep Linking", "AGS grade passback", "NRPS roster service"],
  },
  "moodle": {
    stage: "standard_transport",
    label: "Standard selected · LTI runtime pending",
    summary: "Moodle can consume LTI external tools, but Career Compass does not yet expose a complete LTI 1.3 tool runtime.",
    missing: ["OIDC login initiation", "JWT/JWKS validation", "LTI resource launch", "Deep Linking", "AGS grade passback", "NRPS roster service"],
  },
  "scorm-package": {
    stage: "standard_transport",
    label: "Standard selected · package runtime pending",
    summary: "SCORM is catalogued as a content-launch path, but package import/export and the SCORM runtime bridge are not implemented yet.",
    missing: ["manifest processing", "package storage", "SCORM runtime API", "completion/score mapping"],
  },
  "xapi-lrs": {
    stage: "standard_transport",
    label: "Standard selected · xAPI client pending",
    summary: "The event model is compatible with analytics export, but a real xAPI statement client/LRS authorization path is still required.",
    missing: ["xAPI statement mapping", "LRS authorization", "retry/outbox worker", "live LRS verification"],
  },
  "custom-rest": {
    stage: "canonical_contract",
    label: "Canonical bridge ready · provider work required",
    summary: "Custom REST payloads can normalize safely, but each provider still needs authentication, transport and sync behavior.",
    missing: ["provider authentication", "endpoint contract", "worker/runtime", "live verification"],
  },
  "generic-webhook": {
    stage: "canonical_contract",
    label: "Canonical bridge ready · webhook security pending",
    summary: "Inbound events have an idempotent storage path, but public webhook verification is not yet implemented.",
    missing: ["webhook signature verification", "public receiver authorization", "event processor", "live verification"],
  },
};

const PROFILE_ONLY: ConnectorReadiness = {
  stage: "provider_authorization",
  label: "Provider profile only",
  summary: "The provider is catalogued, but it currently uses the generic canonical adapter and has no live provider authorization/runtime.",
  missing: ["provider-specific authorization", "provider transport", "provider mapping tests", "live verification"],
};

export function getConnectorReadiness(providerSlug: string): ConnectorReadiness {
  return READY[String(providerSlug || "").trim().toLowerCase()] ?? PROFILE_ONLY;
}

export function connectorIsPlugAndPlay(readiness: ConnectorReadiness) {
  return readiness.stage === "live_verified";
}
