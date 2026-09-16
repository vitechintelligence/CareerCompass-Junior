import { getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

function unavailable() {
  return Response.json(
    { error: "Authentication is not configured for this deployment." },
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
  const auth = getAuth();
  if (!auth) return unavailable();
  const handlers = auth.handler();
  return handlers.POST(request, context);
}
