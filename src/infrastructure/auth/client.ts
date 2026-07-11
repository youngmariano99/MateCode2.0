import { createBrowserClient } from "@supabase/ssr";
import { config } from "../configuracion/config";

const supabaseUrl = config.supabase.url || "https://placeholder.supabase.co";
const supabaseAnonKey = config.supabase.anonKey || "placeholder-key";

export const crearClienteBrowser = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);
