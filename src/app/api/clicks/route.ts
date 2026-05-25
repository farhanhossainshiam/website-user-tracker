import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/client";
import { parseUserAgent } from "@/lib/parser";
import { getGeoData } from "@/lib/geo";

export async function POST(request: NextRequest) {
  try {
    const { shortCode, screenResolution, language, referrer } = await request.json();

    if (!shortCode) {
      return NextResponse.json({ error: "shortCode required" }, { status: 400 });
    }

    const supabase = createAnonClient();

    const { data: link, error: linkError } = await supabase
      .from("Link")
      .select("*")
      .eq("shortCode", shortCode)
      .single();

    if (linkError || !link || !link.isActive) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfIp = request.headers.get("cf-connecting-ip");
    const ip = cfIp || forwardedFor?.split(",")[0]?.trim() || realIp || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";
    const ua = parseUserAgent(userAgent);
    const geo = await getGeoData(ip);

    const { error: clickError } = await supabase
      .from("Click")
      .insert({
        linkId: link.id,
        ipAddress: ip,
        userAgent,
        browser: ua.browser,
        browserVersion: ua.browserVersion,
        os: ua.os,
        osVersion: ua.osVersion,
        deviceType: ua.deviceType,
        screenResolution: screenResolution || "",
        language: language || "",
        referrer: referrer || "",
        country: geo.country,
        city: geo.city,
        isp: geo.isp,
      });

    if (clickError) {
      console.error("Track click error:", clickError);
    }

    const { error: updateError } = await supabase
      .from("Link")
      .update({ clickCount: (link.clickCount || 0) + 1 })
      .eq("id", link.id);

    if (updateError) {
      console.error("Update click count error:", updateError);
    }

    return NextResponse.json({ success: true, originalUrl: link.originalUrl });
  } catch (error) {
    console.error("Track click error:", error);
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}
