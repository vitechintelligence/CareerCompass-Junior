import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Career Compass Junior",
    short_name: "Career Compass",
    description: "Bilingual English, human skills and future-readiness learning for students, teachers and partner organizations.",
    id: "/",
    start_url: "/international",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#0a1e3f",
    orientation: "portrait-primary",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/pwa-icons/v2/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icons/v2/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    shortcuts: [
      {
        name: "Student Workspace",
        short_name: "Student",
        description: "Open the live Career Compass learner workspace",
        url: "/workspace/student",
        icons: [{ src: "/pwa-icons/v2/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Teacher Workspace",
        short_name: "Teacher",
        description: "Open ClassFlow teacher operations",
        url: "/workspace/teacher",
        icons: [{ src: "/pwa-icons/v2/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Partner Workspace",
        short_name: "Partner",
        description: "Open school and training-center operations",
        url: "/workspace/partner",
        icons: [{ src: "/pwa-icons/v2/192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
