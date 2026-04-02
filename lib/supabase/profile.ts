"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  full_name: string;
  company: string;
  created_at: string;
  updated_at: string;
};

/** Fetch the current user's profile. Returns null if not yet created. */
export async function getProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile | null, error: null };
}

/** Create or update the current user's profile. */
export async function upsertProfile(
  fullName: string,
  company: string
): Promise<{ data: UserProfile | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const trimmedName = fullName.trim();
  const trimmedCompany = company.trim();

  if (!trimmedName) return { data: null, error: "Full name is required." };

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      { id: user.id, full_name: trimmedName, company: trimmedCompany },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { data: data as UserProfile, error: null };
}
