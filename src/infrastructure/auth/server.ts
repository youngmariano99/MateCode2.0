import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { config } from "../configuracion/config";

const supabaseUrl = config.supabase.url || "https://placeholder.supabase.co";
const supabaseAnonKey = config.supabase.anonKey || "placeholder-key";

export const crearClienteServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Puede fallar si se llama dentro de un Server Component en render.
          // El Middleware se encargará de persistir los valores en las cabeceras correspondientes.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.delete({ name, ...options });
        } catch {
          // Similarmente ignorado en Server Components.
        }
      },
    },
  });
};
