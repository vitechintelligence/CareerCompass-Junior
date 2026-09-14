import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Compass Junior Mastery",
  description: "Bilingual interactive learning platform for students, teachers and partner organizations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
