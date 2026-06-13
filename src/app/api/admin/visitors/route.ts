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
    const limit = parseInt(url.searchParams.get("limit") || "200");
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: clicks, error: clickError } = await supabase
      .from("Click")
      .select("id, linkId, ipAddress, userAgent, browser, browserVersion, os, osVersion, deviceType, deviceVendor, deviceModel, screenResolution, language, referrer, country, city, isp, clickedAt")
      .order("clickedAt", { ascending: false })
      .range(from, to);

    if (clickError) {
      console.error("Clicks fetch error:", clickError);
    }

    const { data: pageVisits, error: visitError } = await supabase
      .from("PageVisit")
      .select("id, page, domain, ipAddress, userAgent, browser, browserVersion, os, osVersion, deviceType, deviceVendor, deviceModel, screenResolution, language, referrer, country, city, isp, visitedAt")
      .order("visitedAt", { ascending: false })
      .range(from, to);

    if (visitError) {
      console.error("PageVisit fetch error:", visitError);
    }

    const { count: totalClicks } = await supabase.from("Click").select("*", { count: "exact", head: true });
    const { count: totalPageVisits } = await supabase.from("PageVisit").select("*", { count: "exact", head: true });

    const linkIds = [...new Set((clicks || []).map(c => c.linkId))];
    const { data: links } = await supabase
      .from("Link")
      .select("id, shortCode, originalUrl, userEmail, domain")
      .in("id", linkIds.length > 0 ? linkIds : ["00000000-0000-0000-0000-000000000000"]);
    const linkMap = new Map((links || []).map(l => [l.id, l]));

    const clickVisitors = (clicks || []).map(c => {
      const link = linkMap.get(c.linkId);
      return {
        type: "click" as const,
        id: c.id,
        source: link ? `${(link.domain || "dinka.shop")}/s/${link.shortCode}` : "Unknown Link",
        originalUrl: link?.originalUrl || null,
        linkOwner: link?.userEmail || null,
        page: null,
        domain: link?.domain || "",
        ipAddress: c.ipAddress,
        userAgent: c.userAgent,
        browser: c.browser,
        browserVersion: c.browserVersion,
        os: c.os,
        osVersion: c.osVersion || "",
        deviceType: c.deviceType,
        deviceVendor: c.deviceVendor || "",
        deviceModel: c.deviceModel || "",
        screenResolution: c.screenResolution,
        language: c.language,
        referrer: c.referrer,
        country: c.country,
        city: c.city,
        isp: c.isp,
        timestamp: c.clickedAt,
        linkId: c.linkId,
        shortCode: link?.shortCode || null,
        linkDomain: link?.domain || null,
      };
    });

    const pageVisitors = (pageVisits || []).map(v => ({
      type: "visit" as const,
      id: v.id,
      source: v.domain ? `${v.domain}${v.page}` : v.page,
      originalUrl: null,
      linkOwner: null,
      page: v.page,
      domain: v.domain || "",
      ipAddress: v.ipAddress,
      userAgent: v.userAgent,
      browser: v.browser,
      browserVersion: v.browserVersion,
      os: v.os,
      osVersion: v.osVersion || "",
      deviceType: v.deviceType,
      deviceVendor: v.deviceVendor || "",
      deviceModel: v.deviceModel || "",
      screenResolution: v.screenResolution,
      language: v.language,
      referrer: v.referrer,
      country: v.country,
      city: v.city,
      isp: v.isp,
      timestamp: v.visitedAt,
      linkId: null,
      shortCode: null,
      linkDomain: null,
    }));

    const allVisitors = [...clickVisitors, ...pageVisitors].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, limit);

    const uniqueIps = new Set(allVisitors.map(v => v.ipAddress));

    const browsers: Record<string, number> = {};
    const countries: Record<string, number> = {};
    const devices: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    const osStats: Record<string, number> = {};
    const cities: Record<string, number> = {};
    const pages: Record<string, number> = {};

    const domains: Record<string, number> = {};
    for (const v of allVisitors) {
      const b = v.browser || "Unknown";
      browsers[b] = (browsers[b] || 0) + 1;
      const co = v.country || "Unknown";
      countries[co] = (countries[co] || 0) + 1;
      const d = (v.deviceType || "desktop").toLowerCase();
      devices[d] = (devices[d] || 0) + 1;
      const r = v.referrer || "Direct";
      referrers[r] = (referrers[r] || 0) + 1;
      const o = v.os || "Unknown";
      osStats[o] = (osStats[o] || 0) + 1;
      const ci = v.city || "Unknown";
      cities[ci] = (cities[ci] || 0) + 1;
      const dm = v.domain || (v.type === "click" ? v.linkDomain || "dinka.shop" : "unknown");
      domains[dm] = (domains[dm] || 0) + 1;
      if (v.page) pages[v.page] = (pages[v.page] || 0) + 1;
      if (v.type === "click" && v.shortCode) pages[`/s/${v.shortCode}`] = (pages[`/s/${v.shortCode}`] || 0) + 1;
    }

    return NextResponse.json({
      visitors: allVisitors,
      totalClicks: totalClicks || 0,
      totalPageVisits: totalPageVisits || 0,
      uniqueVisitors: uniqueIps.size,
      analytics: {
        browsers: Object.entries(browsers).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        countries: Object.entries(countries).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        devices: Object.entries(devices).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        referrers: Object.entries(referrers).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        os: Object.entries(osStats).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        cities: Object.entries(cities).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
        pages: Object.entries(pages).sort(([,a],[,b]) => b-a).slice(0, 10).map(([name, count]) => ({ name, count })),
        domains: Object.entries(domains).sort(([,a],[,b]) => b-a).map(([name, count]) => ({ name, count })),
      },
      page,
      limit,
    });
  } catch (e) {
    console.error("Visitors error:", e);
    return NextResponse.json({ error: "Failed to load visitors" }, { status: 500 });
  }
}