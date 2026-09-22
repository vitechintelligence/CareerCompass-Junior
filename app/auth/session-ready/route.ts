import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import { safeInternalPath } from "@/lib/navigation";

export const dynamic = "force-dynamic";

function signInRedirect(request: Request, callbackURL: string, reason: string) {
  const url = new URL("/auth/sign-in", request.url);
  url.searchParams.set("callbackURL", callbackURL);
  url.searchParams.set("authError", reason);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const callbackURL = safeInternalPath(
    requestUrl.searchParams.get("callbackURL") || undefined,
    "/workspace",
  );

  const auth = getAuth();
  if (!auth) return signInRedirect(request, callbackURL, "configuration");

  try {
    // Running getSession in this route-handler context allows Neon Auth to
    // write/refresh its signed session cache cookie before an RSC workspace
    // reads it.
    const { data } = await auth.getSession();
    if (!data?.user?.id) {
      return signInRedirect(request, callbackURL, "session");
    }

    return NextResponse.redirect(new URL(callbackURL, request.url), 303);
  } catch {
    return signInRedirect(request, callbackURL, "session");
  }
}
