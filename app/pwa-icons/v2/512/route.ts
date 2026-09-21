import { createVitechPwaIcon } from "@/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  return createVitechPwaIcon(512);
}
