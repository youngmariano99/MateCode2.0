import { createBrowserClient } from "@supabase/ssr";
import { config } from "../configuracion/config";

const supabaseUrl = config.supabase.url || "https://placeholder.supabase.co";
const supabaseAnonKey = config.supabase.anonKey || "placeholder-key";

export const crearClienteBrowser = () => {
  console.log("Supabase URL:", supabaseUrl);
  console.log(
    "Supabase Anon Key length:",
    supabaseAnonKey ? supabaseAnonKey.length : 0
  );
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
