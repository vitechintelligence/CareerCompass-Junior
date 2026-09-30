import { NextResponse } from "next/server";
import { fetchNrpsMembers } from "@/lib/lti/service-client";
import { getCurrentLtiSession } from "@/lib/lti/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentLtiSession();
  if (!session) return NextResponse.json({ error: "Active LTI session required." }, { status: 401 });
  if (!["teacher","platform_admin"].includes(String(session.account_type))) {
    return NextResponse.json({ error: "Instructor LTI session required." }, { status: 403 });
  }

  try {
    const members = await fetchNrpsMembers(session);
    return NextResponse.json({
      ok: true,
      count: members.length,
      members: members.slice(0, 500).map((member) => ({
        user_id: typeof member.user_id === "string" ? member.user_id : null,
        name: typeof member.name === "string" ? member.name : null,
        roles: Array.isArray(member.roles) ? member.roles.map(String) : [],
        status: typeof member.status === "string" ? member.status : null,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "lti_nrps_failed",
    }, { status: 502 });
  }
}
