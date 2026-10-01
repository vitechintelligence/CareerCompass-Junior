import { getAuth, getAuthConfigurationStatus } from "@/lib/auth/server";
import { learnerOnboardingApproved } from "@/lib/privacy/policy";

export const dynamic = "force-dynamic";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

function unavailable() {
  const configuration = getAuthConfigurationStatus();

  return Response.json(
    {
      error: "Authentication is not configured correctly for this deployment.",
      missing: configuration.missing,
      invalid: configuration.invalid,
    },
    { status: 503 },
  );
}

export async function GET(request: Request, context: AuthRouteContext) {
  const auth = getAuth();
  if (!auth) return unavailable();
  const handlers = auth.handler();
  return handlers.GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  const { path } = await context.params;
  if (path.join("/").startsWith("sign-up") && !learnerOnboardingApproved()) {
    return Response.json({error:"learner_onboarding_not_approved"},{status:403,headers:{"Cache-Control":"no-store"}});
  }
  const auth = getAuth();
  if (!auth) return unavailable();
  const handlers = auth.handler();
  return handlers.POST(request, context);
}
