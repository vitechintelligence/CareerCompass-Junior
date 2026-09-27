import Unit1Experience from "./Unit1Experience";
import ProgressSyncBridge from "./ProgressSyncBridge";
import type { UnitLocale } from "@/lib/unit1";

export default async function Unit1Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; enrollmentId?: string }>;
}) {
  const { lang, enrollmentId } = await searchParams;
  const locale: UnitLocale = lang === "vi" ? "vi" : "en";
  const learningEnrollmentId = typeof enrollmentId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(enrollmentId)
    ? enrollmentId
    : undefined;

  return (
    <>
      <ProgressSyncBridge locale={locale} enrollmentId={learningEnrollmentId} />
      <Unit1Experience locale={locale} />
    </>
  );
}
