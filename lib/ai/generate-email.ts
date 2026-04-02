"use server";

import { vertexGenerateContent } from "./vertex-client";
import { FREE_AI_LIMIT } from "@/lib/supabase/ai-usage-config";


export interface GenerateEmailInput {
  campaignName: string;
  campaignDescription?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactCompany?: string | null;
  senderName?: string | null;
}

export interface GenerateEmailResult {
  subject: string;
  body: string;
  error?: string;
}

export async function generateEmailWithAI(
  input: GenerateEmailInput
): Promise<GenerateEmailResult> {
  const contact = [input.contactFirstName, input.contactLastName].filter(Boolean).join(" ") || "the recipient";
  const company = input.contactCompany ?? "their company";
  const sender  = input.senderName ?? "the sender";

  const prompt = `You are an expert cold email copywriter. Write a professional, concise, and compelling cold outreach email.

Campaign: "${input.campaignName}"${input.campaignDescription ? `\nGoal: ${input.campaignDescription}` : ""}
Recipient: ${contact} at ${company}
Sender: ${sender}

Rules:
- Subject line: punchy, under 50 characters, no spam words
- Body: 3–5 short paragraphs, friendly but professional tone
- Use {{first_name}} and {{company}} as exact placeholder variables in your output (keep the double curly braces literally — they get replaced per-contact at send time)
- Write the sender's name as "${sender}" naturally — do NOT output {{sender_name}} as a placeholder
- End with a clear, single call-to-action
- No hollow filler phrases like "I hope this email finds you well"
- Do NOT include a sign-off line like "Best regards" — the system adds that automatically

Respond with ONLY valid JSON in this exact shape:
{
  "subject": "...",
  "body": "..."
}`;

  try {
    const text = await vertexGenerateContent(prompt);

    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean) as { subject: string; body: string };

    if (!parsed.subject || !parsed.body) throw new Error("Incomplete response from AI");

    return { subject: parsed.subject, body: parsed.body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { subject: "", body: "", error: `AI generation failed: ${msg}` };
  }
}
