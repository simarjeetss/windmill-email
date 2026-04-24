export type EmailAgentMode = "generate" | "writer";

export type EmailWriterMode = "prompt" | "polish";

export interface EmailAgentContactContext {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
}

export interface EmailAgentSenderContext {
  name?: string | null;
  company?: string | null;
}

export interface EmailAgentCampaignFileContext {
  id: string;
  fileName: string;
  storagePath: string;
  contentType?: string | null;
}

export interface GenerateEmailAgentRequest {
  mode: "generate";
  campaignId?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
  contact?: EmailAgentContactContext | null;
  sender?: EmailAgentSenderContext | null;
  campaignFiles?: EmailAgentCampaignFileContext[];
}

export interface WriterEmailAgentRequest {
  mode: "writer";
  writerMode: EmailWriterMode;
  campaignId?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
  userInput: string;
  contact?: EmailAgentContactContext | null;
  sender?: EmailAgentSenderContext | null;
  campaignFiles?: EmailAgentCampaignFileContext[];
}

export type EmailAgentRequest =
  | GenerateEmailAgentRequest
  | WriterEmailAgentRequest;

export interface EmailAgentFinalResult {
  subject?: string;
  body: string;
}

export type EmailAgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool-start"; tool: string; args?: Record<string, unknown> }
  | {
      type: "tool-end";
      tool: string;
      result?: Record<string, unknown>;
      error?: string;
    }
  | { type: "delta"; delta: string }
  | { type: "final"; result: EmailAgentFinalResult }
  | { type: "error"; error: string };
