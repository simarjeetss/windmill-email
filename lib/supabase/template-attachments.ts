"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_TEMPLATE_ATTACHMENTS,
  type AttachmentPayload,
  type TemplateAttachment,
} from "@/lib/supabase/template-attachments.types";

const BUCKET = "template-attachments";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Upload a file; link to template when `templateId` is set, otherwise stage under `pending/`. */
export async function uploadTemplateAttachment(
  formData: FormData
): Promise<{ data: TemplateAttachment | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  const templateIdRaw = formData.get("templateId") as string | null;
  const templateId = templateIdRaw?.trim() || null;

  if (!file) return { data: null, error: "Missing file." };

  if (file.size > MAX_FILE_BYTES) {
    return { data: null, error: "File exceeds 10 MB limit." };
  }

  if (templateId) {
    const { data: tmpl } = await supabase
      .from("email_templates")
      .select("id")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!tmpl) return { data: null, error: "Template not found." };
  }

  let countQ = supabase
    .from("email_template_attachments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  countQ = templateId
    ? countQ.eq("template_id", templateId)
    : countQ.is("template_id", null);

  const { count } = await countQ;

  if ((count ?? 0) >= MAX_TEMPLATE_ATTACHMENTS) {
    return { data: null, error: `At most ${MAX_TEMPLATE_ATTACHMENTS} attachments.` };
  }

  const ts = Date.now();
  const safe = safeFileName(file.name);
  const storagePath = templateId
    ? `${user.id}/${templateId}/${ts}_${safe}`
    : `${user.id}/pending/${randomUUID()}_${safe}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { data: null, error: uploadError.message };

  const { data, error: dbError } = await supabase
    .from("email_template_attachments")
    .insert({
      user_id: user.id,
      template_id: templateId,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { data: null, error: dbError.message };
  }

  return { data: data as TemplateAttachment, error: null };
}

export async function getTemplateAttachments(
  templateId: string
): Promise<{ data: TemplateAttachment[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("id")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!tmpl) return { data: [], error: "Template not found." };

  const { data, error } = await supabase
    .from("email_template_attachments")
    .select("*")
    .eq("template_id", templateId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TemplateAttachment[], error: null };
}

export async function deleteTemplateAttachment(
  attachmentId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: row, error: fetchError } = await supabase
    .from("email_template_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !row) return { error: "Attachment not found." };

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([row.storage_path]);

  const { error: delError } = await supabase
    .from("email_template_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", user.id);

  if (delError) return { error: delError.message };
  return { error: null };
}

/** Remove storage objects for every attachment row tied to a template. Call before deleting the template row. */
export async function deleteTemplateAttachmentStorageForTemplate(
  templateId: string,
  userId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("email_template_attachments")
    .select("storage_path")
    .eq("template_id", templateId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  if (!rows?.length) return { error: null };

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove(rows.map((r) => r.storage_path));

  const { error: delError } = await supabase
    .from("email_template_attachments")
    .delete()
    .eq("template_id", templateId)
    .eq("user_id", userId);

  if (delError) return { error: delError.message };
  return { error: null };
}

async function duplicateAttachmentToTemplate(
  row: TemplateAttachment,
  newTemplateId: string,
  userId: string
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { data: blob, error: dlError } = await admin.storage.from(BUCKET).download(row.storage_path);
  if (dlError || !blob) return { error: dlError?.message ?? "Could not read attachment." };

  const buffer = Buffer.from(await blob.arrayBuffer());
  const safe = safeFileName(row.file_name);
  const newPath = `${userId}/${newTemplateId}/${Date.now()}_${safe}`;

  const { error: upError } = await admin.storage.from(BUCKET).upload(newPath, buffer, {
    contentType: row.content_type || "application/octet-stream",
    upsert: false,
  });
  if (upError) return { error: upError.message };

  const supabase = await createClient();
  const { error: insError } = await supabase.from("email_template_attachments").insert({
    user_id: userId,
    template_id: newTemplateId,
    file_name: row.file_name,
    file_size: row.file_size,
    content_type: row.content_type,
    storage_path: newPath,
  });

  if (insError) {
    await admin.storage.from(BUCKET).remove([newPath]);
    return { error: insError.message };
  }
  return { error: null };
}

/**
 * After creating a new template, attach staged files or duplicate files from another template.
 */
export async function linkOrDuplicateAttachmentsToTemplate(
  newTemplateId: string,
  attachmentIds: string[],
  userId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const seen = new Set<string>();

  for (const id of attachmentIds) {
    if (seen.has(id)) continue;
    seen.add(id);

    const { data: row, error } = await supabase
      .from("email_template_attachments")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) return { error: "Invalid attachment." };

    const r = row as TemplateAttachment;

    if (r.template_id === newTemplateId) continue;

    if (r.template_id === null) {
      const newPath = `${userId}/${newTemplateId}/${Date.now()}_${safeFileName(r.file_name)}`;
      const admin = createAdminClient();
      const { error: moveError } = await admin.storage
        .from(BUCKET)
        .move(r.storage_path, newPath);
      if (moveError) return { error: moveError.message };

      const { error: updError } = await supabase
        .from("email_template_attachments")
        .update({ template_id: newTemplateId, storage_path: newPath })
        .eq("id", id)
        .eq("user_id", userId);

      if (updError) {
        await admin.storage.from(BUCKET).move(newPath, r.storage_path);
        return { error: updError.message };
      }
      continue;
    }

    const dupErr = await duplicateAttachmentToTemplate(r, newTemplateId, userId);
    if (dupErr.error) return { error: dupErr.error };
  }

  return { error: null };
}

/** Load file bytes for outbound email (server-only). */
export async function loadAttachmentsForSend(
  attachmentIds: string[],
  userId: string
): Promise<{ data: AttachmentPayload[]; error: string | null }> {
  if (attachmentIds.length === 0) return { data: [], error: null };

  const supabase = await createClient();
  const admin = createAdminClient();
  const out: AttachmentPayload[] = [];

  for (const id of attachmentIds) {
    const { data: row, error } = await supabase
      .from("email_template_attachments")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) return { data: [], error: "Invalid attachment." };

    const r = row as TemplateAttachment;
    const { data: blob, error: dlError } = await admin.storage.from(BUCKET).download(r.storage_path);
    if (dlError || !blob) return { data: [], error: dlError?.message ?? "Could not load attachment." };

    const buffer = Buffer.from(await blob.arrayBuffer());
    out.push({ filename: r.file_name, content: buffer });
  }

  return { data: out, error: null };
}
