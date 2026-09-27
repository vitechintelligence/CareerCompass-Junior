import { NextResponse } from "next/server";
import { absoluteUrl, CANONICAL_PRODUCTION_ORIGIN } from "@/lib/site";
import { LTI_MESSAGE_TYPES, LTI_SCOPES } from "@/lib/lti/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const domain = new URL(CANONICAL_PRODUCTION_ORIGIN).hostname;
  const launchUrl = absoluteUrl("/api/lti/launch");

  return NextResponse.json({
    title: "Career Compass Junior",
    description: "Career readiness, English mastery, STEAM/AI learning and evidence experiences for K-12 institutions.",
    oidc_initiation_url: absoluteUrl("/api/lti/oidc/login"),
    target_link_uri: launchUrl,
    scopes: [
      LTI_SCOPES.agsLineitem,
      LTI_SCOPES.agsResultReadonly,
      LTI_SCOPES.agsScore,
      LTI_SCOPES.nrpsContextMembershipReadonly,
    ],
    public_jwk_url: absoluteUrl("/api/lti/.well-known/jwks.json"),
    extensions: [{
      domain,
      tool_id: "career-compass-junior",
      platform: "canvas.instructure.com",
      privacy_level: "name_only",
      settings: {
        text: "Career Compass Junior",
        labels: {
          en: "Career Compass Junior",
          vi: "Career Compass Junior",
        },
        selection_height: 720,
        selection_width: 1100,
        placements: [
          {
            placement: "course_navigation",
            message_type: LTI_MESSAGE_TYPES.resourceLink,
            target_link_uri: launchUrl,
            text: "Career Compass Junior",
            labels: {
              en: "Career Compass Junior",
              vi: "Career Compass Junior",
            },
            default: "disabled",
          },
          {
            placement: "link_selection",
            message_type: LTI_MESSAGE_TYPES.deepLinkRequest,
            target_link_uri: launchUrl,
            text: "Add Career Compass content",
            labels: {
              en: "Add Career Compass content",
              vi: "Thêm nội dung Career Compass",
            },
            enabled: true,
            selection_height: 720,
            selection_width: 1100,
          },
          {
            placement: "assignment_selection",
            message_type: LTI_MESSAGE_TYPES.deepLinkRequest,
            target_link_uri: launchUrl,
            text: "Add Career Compass assignment",
            labels: {
              en: "Add Career Compass assignment",
              vi: "Thêm bài tập Career Compass",
            },
            enabled: true,
            selection_height: 720,
            selection_width: 1100,
          },
        ],
      },
    }],
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
