/** Constants and types for template attachments (importable from client components). */

export const MAX_TEMPLATE_ATTACHMENTS = 10;

export type TemplateAttachment = {
  id: string;
  user_id: string;
  template_id: string | null;
  file_name: string;
  file_size: number;
  content_type: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};

export type AttachmentPayload = { filename: string; content: Buffer };
