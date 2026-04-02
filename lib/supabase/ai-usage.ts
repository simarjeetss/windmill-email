"use server";

import { createClient } from "@/lib/supabase/server";
import { FREE_AI_LIMIT } from "@/lib/supabase/ai-usage-config";
import type { AiUsageResult } from "@/lib/supabase/ai-usage-config";

/**
 * checkAndIncrementAiUsage
 *
 * Atomically checks whether the authenticated user is still within the
 * free-tier AI generation limit, and — if so — increments their counter.
 *
 * Returns `limitExceeded: true` (without incrementing) when the user is
 * at or above FREE_AI_LIMIT.
 */
export async function checkAndIncrementAiUsage(): Promise<AiUsageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { count: 0, limitExceeded: false, error: "Not authenticated" };
  }

  // Fetch current count — upsert a row if the user has no profile yet
  const { data: profile, error: fetchError } = await supabase
    .from("user_profiles")
    .select("ai_generation_count")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { count: 0, limitExceeded: false, error: fetchError.message };
  }

  const current = (profile?.ai_generation_count ?? 0) as number;

  if (current >= FREE_AI_LIMIT) {
    return { count: current, limitExceeded: true };
  }

  // Increment
  const { data: updated, error: updateError } = await supabase
    .from("user_profiles")
    .upsert(
      { id: user.id, ai_generation_count: current + 1 },
      { onConflict: "id" }
    )
    .select("ai_generation_count")
    .single();

  if (updateError) {
    return { count: current, limitExceeded: false, error: updateError.message };
  }

  return { count: (updated?.ai_generation_count as number) ?? current + 1, limitExceeded: false };
}

/**
 * getAiUsageCount
 *
 * Returns the current AI generation count for the authenticated user,
 * without incrementing it. Useful for displaying remaining uses in the UI.
 */
export async function getAiUsageCount(): Promise<{ count: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { count: 0, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_profiles")
    .select("ai_generation_count")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { count: 0, error: error.message };
  return { count: (data?.ai_generation_count ?? 0) as number };
}
