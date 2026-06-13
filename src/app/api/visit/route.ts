import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/client";
import { parseUserAgent } from "@/lib/parser";
import { getGeoData } from "@/lib/geo";

export async function POST(request: NextRequest) {
  try {
    const { page, screenResolution, language, referrer } = await request.json();

    if (!page) {
      return NextResponse.json({ error: "page required" }, { status: 400 });
    }

    const supabase = createAnonClient();

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfIp = request.headers.get("cf-connecting-ip");
    const ip = cfIp || forwardedFor?.split(",")[0]?.trim() || realIp || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";
    const ua = parseUserAgent(userAgent);
    const geo = await getGeoData(ip);

    const payload: Record<string, unknown> = {
      page,
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
    };

    if (ua.deviceVendor) payload.deviceVendor = ua.deviceVendor;
    if (ua.deviceModel) payload.deviceModel = ua.deviceModel;

    let { error } = await supabase.from("PageVisit").insert(payload);

    if (error && error.message?.match(/device(Vendor|Model)/)) {
      delete payload.deviceVendor;
      delete payload.deviceModel;
      const retry = await supabase.from("PageVisit").insert(payload);
      error = retry.error;
    }

    if (error) {
      console.error("PageVisit insert error:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Page visit track error:", error);
    return NextResponse.json({ error: "Failed to track visit" }, { status: 500 });
  }
}