import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/persistencia/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
