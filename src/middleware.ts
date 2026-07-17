import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config as appConfig } from "./infrastructure/configuracion/config";

const supabaseUrl = appConfig.supabase.url || "https://placeholder.supabase.co";
const supabaseAnonKey = appConfig.supabase.anonKey || "placeholder-key";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
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
