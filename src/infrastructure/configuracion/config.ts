export const config = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    entorno: process.env.NODE_ENV || "development",
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
} as const;

export type Config = typeof config;
export default config;
