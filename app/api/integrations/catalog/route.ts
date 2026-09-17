import { NextResponse } from "next/server";
import { integrationStandards, listIntegrationProviders } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await listIntegrationProviders();
  return NextResponse.json({
    version: "2026-09",
    providers,
    standards: integrationStandards,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
