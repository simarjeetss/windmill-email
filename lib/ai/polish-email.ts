"use server";

import { vertexGenerateContent } from "./vertex-client";

export interface PolishEmailInput {
  userInput: string;
  mode: "prompt" | "polish";
  campaignName: string;
  senderName?: string | null;
}

export interface PolishEmailResult {
  body: string;
  subject?: string;
  error?: string;
}

export async function polishEmailWithAI(
  input: PolishEmailInput
): Promise<PolishEmailResult> {
  if (!input.userInput.trim())
    return { body: "", error: "Please enter a prompt or draft before generating." };

  const sender = input.senderName ?? "the sender";

  const sharedRules = `
- Keep the tone professional but warm
- Use {{first_name}} and {{company}} as exact placeholder variables (keep double curly braces — they get replaced per-contact at send time)
- Write the sender's name as "${sender}" — do NOT output {{sender_name}} as a placeholder
- No hollow filler phrases like "I hope this email finds you well"
- Do NOT add a sign-off like "Best regards" — the system adds that automatically`;

  const prompt =
    input.mode === "prompt"
      ? `You are an expert cold email copywriter. Write a professional cold outreach email based on the following brief.

Campaign context: "${input.campaignName}"
Sender: ${sender}
User's brief: ${input.userInput}

Rules:${sharedRules}
- Subject line: punchy, under 50 characters
- Body: 3–5 short paragraphs with a clear call-to-action

Respond with ONLY valid JSON:
{ "subject": "...", "body": "..." }`
      : `You are an expert email editor. Rewrite the following rough draft into a polished cold outreach email.

Campaign context: "${input.campaignName}"
Sender: ${sender}
User's draft:
---
${input.userInput}
---

Rules:${sharedRules}
- Preserve the original intent and any specific details from the draft
- Improve clarity, tone, and persuasiveness
- Keep it concise — trim anything redundant

Respond with ONLY valid JSON:
{ "body": "..." }`;

  try {
    const text = await vertexGenerateContent(prompt);

    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean) as { subject?: string; body: string };

    if (!parsed.body) throw new Error("Incomplete response from AI");

    return { body: parsed.body, subject: parsed.subject };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { body: "", error: `AI generation failed: ${msg}` };
  }
}
