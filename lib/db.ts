import { neon } from "@neondatabase/serverless";
import { assertNoKnownProductionProjectMismatch } from "@/lib/runtime-alignment";

export function getDb() {
  assertNoKnownProductionProjectMismatch();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Add the Career Compass LMS Neon pooled connection string in Vercel or .env.local.",
    );
  }

  return neon(databaseUrl);
}
