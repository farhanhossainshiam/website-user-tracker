import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("Profile").select("role").eq("userId", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { ban, email } = await request.json();

    if (ban) {
      await supabase.from("BannedUsers").upsert({
        userId: id,
        userEmail: email || "",
        bannedAt: new Date().toISOString(),
        bannedBy: user.email || "",
      });
    } else {
      await supabase.from("BannedUsers").delete().eq("userId", id);
    }

    return NextResponse.json({ success: true, banned: !!ban });
  } catch (e) {
    console.error("Ban error:", e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("Profile").select("role").eq("userId", user.id).single();
    if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const { data: links } = await supabase.from("Link").select("id").eq("userId", id);
    for (const link of links || []) {
      await supabase.from("Click").delete().eq("linkId", link.id);
    }
    await supabase.from("Link").delete().eq("userId", id);
    await supabase.from("UserPresence").delete().eq("userId", id);
    await supabase.from("BannedUsers").delete().eq("userId", id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete error:", e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
