import { safeInternalPath } from "@/lib/navigation";
import { ForgotPasswordForm } from "../PasswordRecoveryForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  return <ForgotPasswordForm callbackUrl={safeInternalPath(callbackURL, "/workspace/student")} />;
}
