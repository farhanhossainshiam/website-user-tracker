import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("Profile").select("role").eq("userId", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: profiles } = await supabase.from("Profile").select("userId, email, role");
    const { data: links } = await supabase.from("Link").select("userId, clickCount");
    const { data: presence } = await supabase.from("UserPresence").select("userId, lastSeenAt, userEmail");
    const { data: bans } = await supabase.from("BannedUsers").select("userId, bannedAt");

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const profileMap = new Map<string, { email: string; role: string }>();
    for (const p of profiles || []) {
      profileMap.set(p.userId, { email: p.email || "", role: p.role });
    }

    const linkCounts = new Map<string, { linkCount: number; totalClicks: number }>();
    for (const link of links || []) {
      if (!link.userId) continue;
      const existing = linkCounts.get(link.userId) || { linkCount: 0, totalClicks: 0 };
      existing.linkCount++;
      existing.totalClicks += link.clickCount || 0;
      linkCounts.set(link.userId, existing);
    }

    const presenceByUser = new Map<string, { lastSeenAt: string; userEmail: string }>();
    for (const p of presence || []) {
      if (p.userId) {
        presenceByUser.set(p.userId, { lastSeenAt: p.lastSeenAt || "", userEmail: p.userEmail || "" });
      }
    }

    const bannedSet = new Set<string>();
    for (const b of bans || []) {
      bannedSet.add(b.userId);
    }

    const allUserIds = new Set([...profileMap.keys(), ...presenceByUser.keys()]);

    const users = Array.from(allUserIds).map((userId) => {
      const prof = profileMap.get(userId);
      const pres = presenceByUser.get(userId);
      const lc = linkCounts.get(userId) || { linkCount: 0, totalClicks: 0 };
      const lastSeen = pres?.lastSeenAt ? new Date(pres.lastSeenAt).toISOString() : null;
      const isOnline = lastSeen ? new Date(lastSeen) > fiveMinutesAgo : false;
      return {
        userId,
        email: prof?.email || pres?.userEmail || "",
        role: prof?.role || "user",
        linkCount: lc.linkCount,
        totalClicks: lc.totalClicks,
        isOnline,
        lastSeen,
        isBanned: bannedSet.has(userId),
      };
    });

    const onlineCount = users.filter((u) => u.isOnline).length;
    const offlineCount = users.length - onlineCount;

    return NextResponse.json({ users, onlineCount, offlineCount, totalUsers: users.length });
  } catch (e) {
    console.error("List users error:", e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}