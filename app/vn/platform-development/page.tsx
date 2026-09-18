import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import PlatformDevelopmentExperience from "@/app/platform-development/PlatformDevelopmentExperience";

export const metadata: Metadata = {
  title: "Phát triển nền tảng | ViTech Intelligence Solutions",
  description:
    "ViTech Intelligence Solutions thiết kế và xây dựng nền tảng web ưu tiên di động, LMS, cổng đối tác, hệ thống vận hành và ứng dụng workflow sẵn sàng cho AI.",
  alternates: {
    canonical: "/vn/platform-development",
    languages: { en: "/platform-development", vi: "/vn/platform-development" },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Phát triển nền tảng | ViTech Intelligence Solutions",
    description:
      "Nền tảng tùy chỉnh từ khám phá nhu cầu và kiến trúc đến triển khai sản xuất bảo mật.",
    type: "website",
    url: SITE_URL + "/vn/platform-development",
    siteName: "ViTech Intelligence Solutions",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary",
    title: "ViTech Phát triển nền tảng",
    description:
      "Nền tảng ưu tiên di động, cổng vận hành, LMS và ứng dụng workflow sẵn sàng cho AI.",
  },
};

export default function PlatformDevelopmentVietnamesePage() {
  return <PlatformDevelopmentExperience locale="vi" />;
}
