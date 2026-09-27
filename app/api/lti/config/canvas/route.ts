import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { LTI_MESSAGE_TYPES, LTI_SCOPES } from "@/lib/lti/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const domain = new URL(absoluteUrl("/")).hostname;
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
            windowTarget: "_blank",
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
