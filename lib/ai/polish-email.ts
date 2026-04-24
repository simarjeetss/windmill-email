"use server";

import { executeEmailAgent } from "./email-agent.service";

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

  try {
    const result = await executeEmailAgent({
      mode: "writer",
      writerMode: input.mode,
      campaignName: input.campaignName,
      userInput: input.userInput,
      sender: {
        name: input.senderName,
      },
    });

    return { body: result.body, subject: result.subject };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("__RATE_LIMIT__:")) {
      return { body: "", error: msg };
    }
    return { body: "", error: `AI generation failed: ${msg}` };
  }
}
