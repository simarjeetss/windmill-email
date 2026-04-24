"use server";

import { executeEmailAgent } from "./email-agent.service";


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
  try {
    const result = await executeEmailAgent({
      mode: "generate",
      campaignName: input.campaignName,
      campaignDescription: input.campaignDescription,
      contact: {
        firstName: input.contactFirstName,
        lastName: input.contactLastName,
        company: input.contactCompany,
      },
      sender: {
        name: input.senderName,
      },
    });

    if (!result.subject) {
      throw new Error("Incomplete response from AI");
    }

    return { subject: result.subject, body: result.body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("__RATE_LIMIT__:")) {
      return { subject: "", body: "", error: msg };
    }
    return { subject: "", body: "", error: `AI generation failed: ${msg}` };
  }
}
