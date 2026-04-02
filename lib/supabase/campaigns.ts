"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
  contact_count?: number;
};

export type Contact = {
  id: string;
  campaign_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  created_at: string;
};

export type ContactWithCampaign = Contact & {
  campaign_name: string | null;
};

// ─── Campaign actions ─────────────────────────────────────────────────────────

export async function getCampaigns(): Promise<{ data: Campaign[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, contacts(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  // Flatten the count from the join
  const campaigns = (data ?? []).map((row: Record<string, unknown>) => {
    const contactsArr = row.contacts as { count: number }[] | null;
    const { contacts: _c, ...rest } = row;
    void _c;
    return {
      ...rest,
      contact_count: contactsArr?.[0]?.count ?? 0,
    } as unknown as Campaign;
  });

  return { data: campaigns, error: null };
}

export async function getCampaign(id: string): Promise<{ data: Campaign | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Campaign, error: null };
}

export async function createCampaign(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const status = (formData.get("status") as string) || "draft";

  if (!name) return { error: "Campaign name is required." };
  if (name.length > 100) return { error: "Name must be 100 characters or fewer." };

  const { error } = await supabase
    .from("campaigns")
    .insert({ user_id: user.id, name, description, status });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/campaigns");
  redirect("/dashboard/campaigns");
}

export async function updateCampaignStatus(
  id: string,
  status: Campaign["status"]
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/campaigns/${id}`);
  revalidatePath("/dashboard/campaigns");
  return { error: null };
}

export async function deleteCampaign(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/campaigns");
  redirect("/dashboard/campaigns");
}

// ─── Contact actions ──────────────────────────────────────────────────────────

export async function getContacts(campaignId: string): Promise<{ data: Contact[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Contact[], error: null };
}

export async function getAllContacts(): Promise<{ data: ContactWithCampaign[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("contacts")
    .select("*, campaigns(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const contacts = (data ?? []).map((row: Record<string, unknown>) => {
    const campaign = row.campaigns as { name?: string } | null;
    const { campaigns: _c, ...rest } = row;
    void _c;
    return {
      ...(rest as Contact),
      campaign_name: campaign?.name ?? null,
    } as ContactWithCampaign;
  });

  return { data: contacts, error: null };
}

export async function addContact(
  campaignId: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const first_name = (formData.get("first_name") as string)?.trim() || null;
  const last_name = (formData.get("last_name") as string)?.trim() || null;
  const company = (formData.get("company") as string)?.trim() || null;

  if (!email) return { error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email address." };

  const { error } = await supabase
    .from("contacts")
    .insert({ campaign_id: campaignId, user_id: user.id, email, first_name, last_name, company });

  if (error) {
    if (error.code === "23505") return { error: "This email already exists in the campaign." };
    return { error: error.message };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { error: null };
}

export async function importContacts(
  campaignId: string,
  rows: { email: string; first_name?: string; last_name?: string; company?: string }[]
): Promise<{ inserted: number; skipped: number; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { inserted: 0, skipped: 0, error: "Not authenticated" };

  const valid = rows
    .filter((r) => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim()))
    .map((r) => ({
      campaign_id: campaignId,
      user_id: user.id,
      email: r.email.trim().toLowerCase(),
      first_name: r.first_name?.trim() || null,
      last_name: r.last_name?.trim() || null,
      company: r.company?.trim() || null,
    }));

  const skipped = rows.length - valid.length;

  if (valid.length === 0) return { inserted: 0, skipped, error: "No valid email addresses found." };

  // Insert all valid rows; skip any that share an existing (campaign_id, email)
  // by filtering them out client-side first to avoid a DB constraint requirement.
  const { data: existing } = await supabase
    .from("contacts")
    .select("email")
    .eq("campaign_id", campaignId);

  const existingEmails = new Set((existing ?? []).map((r: { email: string }) => r.email.toLowerCase()));
  const fresh = valid.filter((r) => !existingEmails.has(r.email));
  const skippedDupes = valid.length - fresh.length;

  if (fresh.length === 0) return { inserted: 0, skipped: skipped + skippedDupes, error: null };

  const { data, error } = await supabase
    .from("contacts")
    .insert(fresh)
    .select("id");

  if (error) return { inserted: 0, skipped, error: error.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { inserted: data?.length ?? 0, skipped: skipped + skippedDupes, error: null };
}

export async function deleteContact(
  contactId: string,
  campaignId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { error: null };
}
