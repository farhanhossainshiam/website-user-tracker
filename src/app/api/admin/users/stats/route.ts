import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("Profile").select("role").eq("userId", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { count: totalUsers } = await supabase.from("Profile").select("*", { count: "exact", head: true });

    const { data: presence } = await supabase.from("UserPresence").select("userId, lastSeenAt");
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let onlineCount = 0;
    let offlineCount = 0;
    for (const p of presence || []) {
      if (p.lastSeenAt && new Date(p.lastSeenAt) > fiveMinutesAgo) {
        onlineCount++;
      } else {
        offlineCount++;
      }
    }
    const presenceUserIds = new Set((presence || []).map(p => p.userId));
    const usersNeverSeen = (totalUsers || 0) - presenceUserIds.size;
    offlineCount += Math.max(0, usersNeverSeen);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      onlineUsers: onlineCount,
      offlineUsers: offlineCount,
    });
  } catch (e) {
    console.error("User stats error:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
