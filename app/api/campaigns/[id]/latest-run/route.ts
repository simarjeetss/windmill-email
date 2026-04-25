import { NextResponse } from "next/server";

import { getLatestCampaignRun } from "@/lib/campaign-send/service";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ run: null, error: "Not authenticated" }, { status: 401 });
  }

  const run = await getLatestCampaignRun(user.id, id);
  return NextResponse.json({ run, error: null });
}