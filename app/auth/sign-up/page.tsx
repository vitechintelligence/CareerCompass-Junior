import AuthForm from "../AuthForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  return <AuthForm mode="sign-up" callbackUrl={callbackURL || "/portal/student"} />;
}
