import { NextResponse } from "next/server";
import { listIntegrationProviders } from "@/lib/integrations/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const providers = await listIntegrationProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("integration providers error", error);
    return NextResponse.json({ error: "Unable to load integration providers" }, { status: 500 });
  }
}
