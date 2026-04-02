"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignFile = {
  id: string;
  campaign_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  storage_path: string;
  created_at: string;
};

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage and record it in campaign_files.
 * Accepts a FormData with: file (File), campaignId (string).
 */
export async function uploadCampaignFile(
  formData: FormData
): Promise<{ data: CampaignFile | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;

  if (!file || !campaignId) return { data: null, error: "Missing file or campaign ID." };

  // Validate file size (max 10 MB)
  if (file.size > 10 * 1024 * 1024) {
    return { data: null, error: "File exceeds 10 MB limit." };
  }

  // Build a unique storage path: <user_id>/<campaign_id>/<timestamp>_<filename>
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${campaignId}/${timestamp}_${safeName}`;

  // Convert File to Buffer for server-side Supabase Storage upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage via admin client (bypasses storage RLS)
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("campaign-files")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { data: null, error: uploadError.message };

  // Record metadata in campaign_files table
  const { data, error: dbError } = await supabase
    .from("campaign_files")
    .insert({
      campaign_id: campaignId,
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) return { data: null, error: dbError.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { data: data as CampaignFile, error: null };
}

/**
 * Get all files associated with a campaign.
 */
export async function getCampaignFiles(
  campaignId: string
): Promise<{ data: CampaignFile[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("campaign_files")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as CampaignFile[], error: null };
}

/**
 * Get a temporary signed URL to download/preview a campaign file.
 * Valid for 60 minutes.
 */
export async function getCampaignFileUrl(
  storagePath: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Not authenticated" };

  // Verify the path belongs to this user
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { url: null, error: "Unauthorized" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("campaign-files")
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

/**
 * Delete a campaign file from storage and the database.
 */
export async function deleteCampaignFile(
  fileId: string,
  campaignId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the record to get the storage path
  const { data: fileRecord, error: fetchError } = await supabase
    .from("campaign_files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !fileRecord) return { error: "File not found." };

  // Delete from storage via admin client (bypasses storage RLS)
  const admin = createAdminClient();
  await admin.storage
    .from("campaign-files")
    .remove([fileRecord.storage_path]);

  // Delete from database
  const { error: dbError } = await supabase
    .from("campaign_files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", user.id);

  if (dbError) return { error: dbError.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { error: null };
}
