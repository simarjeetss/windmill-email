import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const target = url.searchParams.get("u");

  if (!target) {
    return NextResponse.json({ error: "Missing target url" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    await supabase
      .from("sent_emails")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", id)
      .is("clicked_at", null);
  } catch {
    // ignore tracking failure
  }

  return NextResponse.redirect(decodeURIComponent(target), 302);
}
