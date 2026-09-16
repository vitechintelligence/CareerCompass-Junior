import AuthForm from "../AuthForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  return <AuthForm mode="sign-in" callbackUrl={callbackURL || "/portal/student"} />;
}
