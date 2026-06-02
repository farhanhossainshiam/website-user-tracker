import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (user) {
    const { data: banned } = await supabase
      .from("BannedUsers")
      .select("userId")
      .eq("userId", user.id)
      .single();

    if (banned) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("banned", "1");
      const resp = NextResponse.redirect(url);
      resp.cookies.set("sb-access-token", "", { maxAge: 0 });
      resp.cookies.set("sb-refresh-token", "", { maxAge: 0 });
      return resp;
    }

    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("UserPresence")
      .select("id, userId")
      .eq("userId", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("UserPresence").update({ lastSeenAt: now }).eq("userId", user.id);
    } else {
      await supabase.from("UserPresence").insert({ userId: user.id, userEmail: user.email || "", lastSeenAt: now });
    }

    const { data: profile } = await supabase
      .from("Profile")
      .select("role")
      .eq("userId", user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.from("Profile").upsert({
        userId: user.id,
        email: user.email || "",
        role: "user",
      });
    }

    const isAdmin = profile?.role === "admin";

    if (pathname === "/login" || pathname === "/register") {
      const url = request.nextUrl.clone();
      url.pathname = isAdmin ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin")) {
      if (!isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  } else {
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*", "/admin/:path*"],
};
