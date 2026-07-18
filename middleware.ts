import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Tanpa file ini, session Supabase nggak pernah di-refresh — user bakal
// ke-logout sendiri tiap token-nya expired (default 1 jam).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Wajib dipanggil — ini yang bikin token di-refresh & cookie di-update.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belum login? Lempar ke /login.
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Udah login tapi buka /login? Balikin ke dashboard.
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Semua halaman KECUALI:
    // - /api/cron/* dan /api/telegram/* → dipanggil mesin, pakai CRON_SECRET,
    //   bukan session. Kalau kena middleware, cron-nya bakal ke-redirect ke /login.
    // - file statis Next.js & gambar
    "/((?!api/cron|api/telegram|api/daily-review|_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
