import { redirect } from "next/navigation";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/profile";
import { getPlatformAdminContext } from "@/lib/auth/platform-admin";

export const dynamic = "force-dynamic";

export default async function WorkspaceRouterPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/sign-in?callbackURL=%2Fworkspace");
  }

  const admin = await getPlatformAdminContext();
  if (admin) {
    redirect("/workspace/admin");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/workspace/student");
  }

  if (profile.account_type === "partner_admin") {
    redirect("/workspace/partner");
  }

  if (profile.account_type === "teacher") {
    redirect("/workspace/teacher");
  }

  if (profile.account_type === "platform_admin") {
    redirect("/workspace/admin");
  }

  redirect("/workspace/student");
}
