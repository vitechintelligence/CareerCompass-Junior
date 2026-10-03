import AuthForm from "../AuthForm";
import { safeInternalPath } from "@/lib/navigation";
import Link from "next/link";
import { learnerOnboardingApproved } from "@/lib/privacy/policy";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  if(!learnerOnboardingApproved())return <main className="workspacePage"><div className="workspaceContent"><section className="panel"><h1>Account registration is awaiting school privacy approval.</h1><p>Đăng ký tài khoản đang chờ phê duyệt quyền riêng tư của cơ sở. Existing account holders can still sign in.</p><Link className="button primary" href="/auth/sign-in">Sign in / Đăng nhập</Link> · <Link href="/privacy/school-processing">School processing terms</Link></section></div></main>;
  const { callbackURL } = await searchParams;
  return <AuthForm mode="sign-up" callbackUrl={safeInternalPath(callbackURL, "/workspace/student")} />;
}
