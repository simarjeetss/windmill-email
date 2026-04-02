"use server";

import { createClient } from "@/lib/supabase/server";

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Fetch all saved templates for the current user, ordered newest first */
export async function getAllTemplates(): Promise<{
  data: EmailTemplate[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as EmailTemplate[], error: null };
}

/** Create a new template */
export async function createTemplate(
  name: string,
  subject: string,
  body: string
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  if (!name.trim())    return { data: null, error: "Template name is required." };
  if (!subject.trim()) return { data: null, error: "Subject is required." };
  if (!body.trim())    return { data: null, error: "Body is required." };

  const { data, error } = await supabase
    .from("email_templates")
    .insert({ user_id: user.id, name: name.trim(), subject: subject.trim(), body: body.trim() })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as EmailTemplate, error: null };
}

/** Update an existing template's name, subject, and body */
export async function updateTemplate(
  id: string,
  name: string,
  subject: string,
  body: string
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  if (!name.trim())    return { data: null, error: "Template name is required." };
  if (!subject.trim()) return { data: null, error: "Subject is required." };
  if (!body.trim())    return { data: null, error: "Body is required." };

  const { data, error } = await supabase
    .from("email_templates")
    .update({ name: name.trim(), subject: subject.trim(), body: body.trim() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as EmailTemplate, error: null };
}

/** Delete a template */
export async function deleteTemplate(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

