import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import PlatformDevelopmentExperience from "./PlatformDevelopmentExperience";

export const metadata: Metadata = {
  title: "Platform Development | ViTech Intelligence Solutions",
  description:
    "ViTech Intelligence Solutions designs and builds mobile-first web platforms, LMS products, partner portals, operational systems and AI-ready workflow applications.",
  alternates: {
    canonical: "/platform-development",
    languages: { en: "/platform-development", vi: "/vn/platform-development" },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Platform Development | ViTech Intelligence Solutions",
    description: "Custom platforms from discovery and architecture through secure production deployment.",
    type: "website",
    url: SITE_URL + "/platform-development",
    siteName: "ViTech Intelligence Solutions",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "ViTech Platform Development",
    description: "Mobile-first platforms, operational portals, LMS products and AI-ready workflow applications.",
  },
};

export default function PlatformDevelopmentPage() {
  return <PlatformDevelopmentExperience locale="en" />;
}
