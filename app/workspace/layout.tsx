import type { ReactNode } from "react";
import { LogoutButton } from "@/app/auth/LogoutButton";
import { getSessionUser } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <>
      {user?.id && (
        <div className="workspaceAccountBar">
          <div className="workspaceAccountIdentity">
            <span className="workspaceAccountDot" aria-hidden="true" />
            <span>
              <small>Signed in</small>
              <strong>{user.email || "Career Compass account"}</strong>
            </span>
          </div>
          <LogoutButton />
        </div>
      )}
      {children}
    </>
  );
}
