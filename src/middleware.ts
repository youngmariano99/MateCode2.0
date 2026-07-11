import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config as appConfig } from "./infrastructure/configuracion/config";

const supabaseUrl = appConfig.supabase.url || "https://placeholder.supabase.co";
const supabaseAnonKey = appConfig.supabase.anonKey || "placeholder-key";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        const cookieOptions = options as Record<
          string,
          string | boolean | number | Date
        >;
        request.cookies.set({ name, value, ...cookieOptions });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...cookieOptions });
      },
      remove(name: string) {
        request.cookies.delete(name);
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.delete(name);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isRecoverPage = request.nextUrl.pathname.startsWith(
    "/recuperar-password"
  );
  const isAuthPage = isLoginPage || isRecoverPage;
  const isProtectedPage = request.nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedPage && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/recuperar-password"],
};
