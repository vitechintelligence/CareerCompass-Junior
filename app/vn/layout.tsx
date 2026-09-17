import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Compass Junior Mastery · Vietnam",
  description: "Vietnam-focused Career Compass Junior platform landing.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function VietnamLandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
