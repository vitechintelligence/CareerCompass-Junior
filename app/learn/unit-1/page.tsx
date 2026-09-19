import Unit1Experience from "./Unit1Experience";
import ProgressSyncBridge from "./ProgressSyncBridge";
import type { UnitLocale } from "@/lib/unit1";
import { getCurrentProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function Unit1Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; enrollmentId?: string }>;
}) {
  const { lang, enrollmentId } = await searchParams;
  const locale: UnitLocale = lang === "vi" ? "vi" : "en";
  const profile = await getCurrentProfile();
  const studentProfile = profile?.account_type === "student" && profile.status === "active" ? profile : null;
  const profileScope = studentProfile?.semantic_id ?? null;

  return (
    <>
      <ProgressSyncBridge locale={locale} profileScope={profileScope} enrollmentId={enrollmentId ?? null} />
      <Unit1Experience locale={locale} profileScope={profileScope} enrollmentId={enrollmentId ?? null} />
    </>
  );
}
