import Unit1Experience from "./Unit1Experience";
import type { UnitLocale } from "@/lib/unit1";

export default async function Unit1Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const locale: UnitLocale = lang === "vi" ? "vi" : "en";

  return <Unit1Experience locale={locale} />;
}
