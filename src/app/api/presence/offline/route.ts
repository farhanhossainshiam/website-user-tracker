import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ ok: true });

    const offlineTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase.from("UserPresence").update({ lastSeenAt: offlineTime }).eq("userId", user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
