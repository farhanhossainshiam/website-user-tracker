import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: links, error } = await supabase
      .from("Link")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to get links" }, { status: 500 });

    return NextResponse.json({ links });
  } catch {
    return NextResponse.json({ error: "Failed to get links" }, { status: 500 });
  }
}
