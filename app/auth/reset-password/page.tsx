import { safeInternalPath } from "@/lib/navigation";
import { ResetPasswordForm } from "../PasswordRecoveryForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string; token?: string; error?: string }>;
}) {
  const { callbackURL, token, error } = await searchParams;

  return (
    <ResetPasswordForm
      callbackUrl={safeInternalPath(callbackURL, "/workspace/student")}
      resetError={error?.slice(0, 80) || null}
      token={token?.slice(0, 512) || null}
    />
  );
}
