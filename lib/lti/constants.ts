export const LTI_CLAIMS = {
  messageType: "https://purl.imsglobal.org/spec/lti/claim/message_type",
  version: "https://purl.imsglobal.org/spec/lti/claim/version",
  deploymentId: "https://purl.imsglobal.org/spec/lti/claim/deployment_id",
  targetLinkUri: "https://purl.imsglobal.org/spec/lti/claim/target_link_uri",
  roles: "https://purl.imsglobal.org/spec/lti/claim/roles",
  context: "https://purl.imsglobal.org/spec/lti/claim/context",
  resourceLink: "https://purl.imsglobal.org/spec/lti/claim/resource_link",
  custom: "https://purl.imsglobal.org/spec/lti/claim/custom",
  agsEndpoint: "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint",
  nrps: "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice",
  deepLinkSettings: "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings",
  deepLinkData: "https://purl.imsglobal.org/spec/lti-dl/claim/data",
  contentItems: "https://purl.imsglobal.org/spec/lti-dl/claim/content_items",
} as const;

export const LTI_SCOPES = {
  nrpsContextMembershipReadonly: "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
  agsLineitem: "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
  agsResultReadonly: "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
  agsScore: "https://purl.imsglobal.org/spec/lti-ags/scope/score",
} as const;

export const LTI_MESSAGE_TYPES = {
  resourceLink: "LtiResourceLinkRequest",
  deepLinkRequest: "LtiDeepLinkingRequest",
  deepLinkResponse: "LtiDeepLinkingResponse",
} as const;

export const LTI_VERSION = "1.3.0";
export const LTI_SESSION_COOKIE = "ccj_lti_session";
