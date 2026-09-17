import AuthForm from "../AuthForm";
import { safeInternalPath } from "@/lib/navigation";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  return <AuthForm mode="sign-up" callbackUrl={safeInternalPath(callbackURL, "/portal/student")} />;
}
