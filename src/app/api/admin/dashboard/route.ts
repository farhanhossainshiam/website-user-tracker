import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("Profile")
      .select("role")
      .eq("userId", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { count: totalLinks } = await supabase
      .from("Link")
      .select("*", { count: "exact", head: true });

    const { count: activeLinks } = await supabase
      .from("Link")
      .select("*", { count: "exact", head: true })
      .eq("isActive", true);

    const { count: totalClicks } = await supabase
      .from("Click")
      .select("*", { count: "exact", head: true });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentClicks24h } = await supabase
      .from("Click")
      .select("*", { count: "exact", head: true })
      .gte("clickedAt", oneDayAgo);

    const { data: links } = await supabase
      .from("Link")
      .select("*")
      .order("createdAt", { ascending: false });

    return NextResponse.json({
      totalLinks: totalLinks || 0,
      activeLinks: activeLinks || 0,
      totalClicks: totalClicks || 0,
      recentClicks24h: recentClicks24h || 0,
      links: (links || []).map((l) => ({
        id: l.id,
        shortCode: l.shortCode,
        originalUrl: l.originalUrl,
        clickCount: l.clickCount,
        createdAt: l.createdAt,
        isActive: l.isActive,
        userEmail: l.userEmail,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
