import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = (process.env.DATABASE_URL || "").trim();

// prepare: false is required to support transaction mode connection poolers like Supavisor
// Fallback connection string avoids ERR_INVALID_URL crashes during Vercel build time when env vars might be empty
const client = connectionString
  ? postgres(connectionString, { prepare: false })
  : postgres("postgresql://postgres:postgres@localhost:5432/postgres", {
      prepare: false,
    });

export const db = drizzle(client);
