import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ONE_BY_ONE_GIF = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = createAdminClient();
    await supabase
      .from("sent_emails")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", id)
      .is("opened_at", null);
  } catch {
    // Ignore tracking failures; still return pixel
  }

  return new NextResponse(ONE_BY_ONE_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
