import AuthForm from "../AuthForm";
import { safeInternalPath } from "@/lib/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  return <AuthForm mode="sign-in" callbackUrl={safeInternalPath(callbackURL, "/workspace")} />;
}
