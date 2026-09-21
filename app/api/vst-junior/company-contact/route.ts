import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { findPublicCompanyContact } from "@/lib/vst-junior-ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !["partner_admin", "platform_admin"].includes(profile.account_type)) {
    return NextResponse.json({ error: "Partner administrator access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { companyName?: unknown; website?: unknown };
  const companyName = String(body.companyName || "").trim().slice(0, 180);
  const website = String(body.website || "").trim().slice(0, 500);
  if (companyName.length < 2) {
    return NextResponse.json({ error: "Enter a company name first." }, { status: 400 });
  }

  const result = await findPublicCompanyContact(companyName, website);
  return NextResponse.json(result);
}
