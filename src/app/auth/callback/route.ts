import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "signup";
  const next = searchParams.get("next") ?? "/dashboard";

  if (code || tokenHash) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
    } else if (tokenHash) {
      const verifyType = type === "recovery" ? "recovery" : "signup";
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verifyType });
      if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    return response;
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
