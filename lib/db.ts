import { neon } from "@neondatabase/serverless";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured. Add the Neon pooled connection string in Vercel or .env.local.");
  }
  return neon(databaseUrl);
}
