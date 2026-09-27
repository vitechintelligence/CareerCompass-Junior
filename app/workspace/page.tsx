import Link from "next/link";
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

  if (profile.status !== "active") {
    return (
      <main className="workspacePage">
        <div className="workspaceContent">
          <section className="panel gatePanel">
            <h1>Account access is inactive</h1>
            <p className="muted">This signed-in profile is suspended or archived. Protected workspaces and learning writes are unavailable.</p>
            <Link className="button" href="/">Return home</Link>
          </section>
        </div>
      </main>
    );
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
