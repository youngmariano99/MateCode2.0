import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = (process.env.DATABASE_URL || "").trim();

// prepare: false is required to support transaction mode connection poolers like Supavisor
// ssl: "require" es necesario para conectar contra el pooler de Supabase desde
// un entorno serverless (Vercel) — sin esto la conexión puede colgarse hasta
// el timeout de la función en vez de fallar rápido, lo que el cliente termina
// viendo como "No pudimos conectar con el servidor" (error de red, no de auth).
// Fallback connection string avoids ERR_INVALID_URL crashes during Vercel build time when env vars might be empty
const client = connectionString
  ? postgres(connectionString, { prepare: false, ssl: "require" })
  : postgres("postgresql://postgres:postgres@localhost:5432/postgres", {
      prepare: false,
    });

export const db = drizzle(client);
