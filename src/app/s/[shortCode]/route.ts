import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/client";
import { parseUserAgent } from "@/lib/parser";
import { getGeoData } from "@/lib/geo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    const supabase = createAnonClient();

    const { data: link } = await supabase
      .from("Link")
      .select("*")
      .eq("shortCode", shortCode)
      .single();

    if (!link || !link.isActive) {
      return NextResponse.redirect(new URL("/?error=notfound", request.url));
    }

    // Track click server-side
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfIp = request.headers.get("cf-connecting-ip");
    const ip =
      cfIp || forwardedFor?.split(",")[0]?.trim() || realIp || "127.0.0.1";

    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    const ua = parseUserAgent(userAgent);
    const geo = await getGeoData(ip);

    const clickPayload: Record<string, unknown> = {
      linkId: link.id,
      ipAddress: ip,
      userAgent,
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      osVersion: ua.osVersion,
      deviceType: ua.deviceType,
      screenResolution: "",
      language: "",
      referrer,
      country: geo.country,
      city: geo.city,
      isp: geo.isp,
    };

    if (ua.deviceVendor) clickPayload.deviceVendor = ua.deviceVendor;
    if (ua.deviceModel) clickPayload.deviceModel = ua.deviceModel;

    let { error: clickError } = await supabase
      .from("Click")
      .insert(clickPayload);

    if (clickError && clickError.message?.match(/device(Vendor|Model)/)) {
      delete clickPayload.deviceVendor;
      delete clickPayload.deviceModel;
      const retry = await supabase.from("Click").insert(clickPayload);
      clickError = retry.error;
    }

    if (clickError) {
      console.error("Track click error:", clickError);
    } else {
      await supabase
        .from("Link")
        .update({ clickCount: (link.clickCount || 0) + 1 })
        .eq("id", link.id);
    }

    return NextResponse.redirect(link.originalUrl);
  } catch (error) {
    console.error("Redirect error:", error);
    return NextResponse.redirect(new URL("/?error=invalid", request.url));
  }
}
