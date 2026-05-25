import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const { data: link, error } = await supabase
      .from("Link")
      .select("*")
      .eq("id", id)
      .eq("userId", user.id)
      .single();

    if (error || !link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const { data: clicks } = await supabase
      .from("Click")
      .select("*")
      .eq("linkId", id)
      .order("clickedAt", { ascending: false })
      .limit(200);

    return NextResponse.json({
      id: link.id,
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
      isActive: link.isActive,
      clicks: clicks || [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to load link data" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { isActive } = await request.json();

    const { data: link, error } = await supabase
      .from("Link")
      .update({ isActive })
      .eq("id", id)
      .eq("userId", user.id)
      .select()
      .single();

    if (error || !link) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

    return NextResponse.json({ success: true, isActive: link.isActive });
  } catch {
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const { data: link } = await supabase.from("Link").select("id").eq("id", id).eq("userId", user.id).single();
    if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    await supabase.from("Click").delete().eq("linkId", id);
    await supabase.from("Link").delete().eq("id", id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
