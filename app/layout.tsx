import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "./PwaBootstrap";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
import "./live-workspaces.css";
import "./brand-mobile.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Career Compass Junior Mastery",
    template: "%s | Career Compass Junior",
  },
  description: "Bilingual English, human skills and future-readiness learning platform for students, teachers, schools and training centers.",
  applicationName: "Career Compass Junior",
  keywords: [
    "Career Compass Junior",
    "bilingual English learning",
    "English Vietnamese education",
    "student LMS",
    "teacher portal",
    "school learning platform",
    "life skills",
    "future readiness",
  ],
  authors: [{ name: "ViTech Intelligence Solutions", url: "https://vitechintelligence.com" }],
  creator: "ViTech Intelligence Solutions",
  publisher: "ViTech Intelligence Solutions",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/vitech-logo.svg", type: "image/svg+xml" }],
    shortcut: "/vitech-logo.svg",
    apple: "/vitech-logo.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Career Compass",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1e3f",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaBootstrap />
      </body>
    </html>
  );
}
