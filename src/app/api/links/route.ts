import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/client";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const { url, customCode, domain } = await request.json();
    const userId = request.headers.get("x-user-id") || null;
    const userEmail = request.headers.get("x-user-email") || null;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let originalUrl = url.trim();
    if (!/^https?:\/\//i.test(originalUrl)) {
      originalUrl = "https://" + originalUrl;
    }

    const supabase = createAnonClient();

    if (customCode) {
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(customCode)) {
        return NextResponse.json({ error: "Custom code must be 3-20 alphanumeric characters" }, { status: 400 });
      }
      const { data: existing } = await supabase
        .from("Link")
        .select("shortCode")
        .eq("shortCode", customCode)
        .single();
      if (existing) {
        return NextResponse.json({ error: "This custom code is already taken" }, { status: 409 });
      }
    }

    const shortCode = customCode || nanoid(7);

    const { data: link, error: insertError } = await supabase
      .from("Link")
      .insert({
        shortCode,
        originalUrl,
        userId: userId || undefined,
        userEmail: userEmail || undefined,
      })
      .select()
      .single();

    if (insertError || !link) {
      console.error("Create link error:", insertError);
      return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
    }

    const baseUrl = domain ? "https://" + domain : process.env.NEXT_PUBLIC_BASE_URL;

    return NextResponse.json({
      shortCode: link.shortCode,
      shortUrl: baseUrl + "/s/" + link.shortCode,
      originalUrl: link.originalUrl,
    });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
