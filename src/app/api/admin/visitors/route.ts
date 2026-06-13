import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("Profile").select("role").eq("userId", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: clicks, error } = await supabase
      .from("Click")
      .select("id, linkId, ipAddress, userAgent, browser, browserVersion, os, osVersion, deviceType, deviceVendor, deviceModel, screenResolution, language, referrer, country, city, isp, clickedAt")
      .order("clickedAt", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Visitors fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch visitors" }, { status: 500 });
    }

    const { count: totalClicks } = await supabase
      .from("Click")
      .select("*", { count: "exact", head: true });

    const linkIds = [...new Set((clicks || []).map(c => c.linkId))];
    const { data: links } = await supabase
      .from("Link")
      .select("id, shortCode, originalUrl, userEmail, domain")
      .in("id", linkIds.length > 0 ? linkIds : ["00000000-0000-0000-0000-000000000000"]);

    const linkMap = new Map((links || []).map(l => [l.id, l]));

    const uniqueIps = new Set((clicks || []).map(c => c.ipAddress));
    const browsers: Record<string, number> = {};
    const countries: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    const osStats: Record<string, number> = {};
    const cities: Record<string, number> = {};

    for (const c of clicks || []) {
      const b = c.browser || "Unknown";
      browsers[b] = (browsers[b] || 0) + 1;
      const co = c.country || "Unknown";
      countries[co] = (countries[co] || 0) + 1;
      const d = (c.deviceType || "desktop").toLowerCase();
      devices[d] = (devices[d] || 0) + 1;
      const r = c.referrer || "Direct";
      referrers[r] = (referrers[r] || 0) + 1;
      const o = c.os || "Unknown";
      osStats[o] = (osStats[o] || 0) + 1;
      const ci = c.city || "Unknown";
      cities[ci] = (cities[ci] || 0) + 1;
    }

    const visitors = (clicks || []).map(c => {
      const link = linkMap.get(c.linkId);
      return {
        ...c,
        shortCode: link?.shortCode || null,
        originalUrl: link?.originalUrl || null,
        linkOwner: link?.userEmail || null,
        linkDomain: link?.domain || null,
      };
    });

    return NextResponse.json({
      visitors,
      totalClicks: totalClicks || 0,
      uniqueVisitors: uniqueIps.size,
      analytics: {
        browsers: Object.entries(browsers).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        countries: Object.entries(countries).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        devices: Object.entries(devices).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        referrers: Object.entries(referrers).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        os: Object.entries(osStats).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        cities: Object.entries(cities).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
      },
      page,
      limit,
    });
  } catch (e) {
    console.error("Visitors error:", e);
    return NextResponse.json({ error: "Failed to load visitors" }, { status: 500 });
  }
}