import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("Profile").select("role").eq("userId", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: profiles } = await supabase.from("Profile").select("userId");
    const { data: presence } = await supabase.from("UserPresence").select("userId, lastSeenAt");

    const profileIds = new Set((profiles || []).map(p => p.userId));
    const presenceUserIds = new Set((presence || []).map(p => p.userId));
    const allUserIds = new Set([...profileIds, ...presenceUserIds]);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let onlineCount = 0;
    for (const p of presence || []) {
      if (p.lastSeenAt && new Date(p.lastSeenAt) > fiveMinutesAgo) {
        onlineCount++;
      }
    }

    const totalUsers = allUserIds.size;
    const offlineCount = totalUsers - onlineCount;

    return NextResponse.json({
      totalUsers,
      onlineUsers: onlineCount,
      offlineUsers: offlineCount,
    });
  } catch (e) {
    console.error("User stats error:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}