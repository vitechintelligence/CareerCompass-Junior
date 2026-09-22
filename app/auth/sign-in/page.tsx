import SignInForm from "../SignInForm";
import { safeInternalPath } from "@/lib/navigation";

export const dynamic = "force-dynamic";

function authErrorMessage(reason: string | undefined) {
  if (reason === "configuration") {
    return "Authentication is temporarily unavailable because the deployment configuration needs attention.";
  }
  if (reason === "session") {
    return "Your password was accepted, but the browser did not finish establishing the session. Please sign in again.";
  }
  return null;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string; authError?: string }>;
}) {
  const { callbackURL, authError } = await searchParams;
  return (
    <SignInForm
      callbackUrl={safeInternalPath(callbackURL, "/workspace")}
      initialMessage={authErrorMessage(authError)}
    />
  );
}
