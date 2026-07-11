import { createClient } from "@supabase/supabase-js";
import { config } from "../../../infrastructure/configuracion/config";

const supabaseUrl = config.supabase.url || "https://placeholder.supabase.co";
const supabaseAnonKey = config.supabase.anonKey || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
