import "server-only";

import {
  EventType,
  FunctionTool,
  Gemini,
  InMemorySessionService,
  LlmAgent,
  Runner,
  StreamingMode,
  toStructuredEvents,
  type Event,
  type GeminiParams,
} from "@google/adk";
import {
  GoogleGenAI,
  Type,
  createUserContent,
  type GenerateContentResponse,
  type Schema,
} from "@google/genai";

import { checkAndIncrementAiUsage } from "@/lib/supabase/ai-usage";
import { getCampaignFileUrl } from "@/lib/supabase/campaign-files";

import type {
  EmailAgentCampaignFileContext,
  EmailAgentFinalResult,
  EmailAgentRequest,
  EmailAgentStreamEvent,
} from "./email-agent.types";

const APP_NAME = "windmill-email-email-agent";
const DEFAULT_MODEL = process.env.GOOGLE_GENAI_MODEL ?? "gemini-2.5-flash";
const MAX_FILE_URLS = Number.parseInt(
  process.env.EMAIL_AGENT_MAX_FILE_URLS ?? "3",
  10
);
const TOOL_TIMEOUT_MS = Number.parseInt(
  process.env.EMAIL_AGENT_TOOL_TIMEOUT_MS ?? "15000",
  10
);
const SEARCH_QUERY_LIMIT = 180;

type ModelRuntimeConfig = {
  model: string;
  geminiParams: GeminiParams;
};

type PreparedFileContext = {
  id: string;
  fileName: string;
  url: string;
  contentType?: string | null;
};

type ExecuteOptions = {
  streaming?: boolean;
  onEvent?: (event: EmailAgentStreamEvent) => void;
};

function emit(
  onEvent: ExecuteOptions["onEvent"],
  event: EmailAgentStreamEvent
) {
  onEvent?.(event);
}

function isTruthyEnv(value: string | undefined) {
  return value === "1" || value === "true";
}

function getModelRuntimeConfig(): ModelRuntimeConfig {
  const useVertex = isTruthyEnv(process.env.GOOGLE_GENAI_USE_VERTEXAI);
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? undefined;

  if (useVertex || (project && !apiKey)) {
    if (!project) {
      throw new Error(
        "AI is not configured. Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION for ADK Vertex mode."
      );
    }

    return {
      model: DEFAULT_MODEL,
      geminiParams: {
        model: DEFAULT_MODEL,
        vertexai: true,
        project,
        location,
      },
    };
  }

  if (!apiKey) {
    throw new Error(
      "AI is not configured. Set GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY), or configure ADK Vertex mode with GOOGLE_GENAI_USE_VERTEXAI=1, GOOGLE_CLOUD_PROJECT, and GOOGLE_CLOUD_LOCATION."
    );
  }

  return {
    model: DEFAULT_MODEL,
    geminiParams: {
      model: DEFAULT_MODEL,
      apiKey,
    },
  };
}

function createGroundingClient(runtime: ModelRuntimeConfig) {
  return new GoogleGenAI(runtime.geminiParams);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripCodeFences(value: string) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function extractJsonObject(value: string) {
  const clean = stripCodeFences(value);
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return clean.slice(firstBrace, lastBrace + 1);
  }

  return clean;
}

function parseAgentResult(
  request: EmailAgentRequest,
  rawText: string
): EmailAgentFinalResult {
  const parsed = JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;

  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  const subject =
    typeof parsed.subject === "string" ? parsed.subject.trim() : undefined;

  if (!body) {
    throw new Error("Incomplete response from AI.");
  }

  if (request.mode === "generate" || request.writerMode === "prompt") {
    if (!subject) {
      throw new Error("Incomplete response from AI.");
    }

    return { subject, body };
  }

  return { body, subject };
}

function describeFiles(files: PreparedFileContext[]) {
  if (!files.length) {
    return "No campaign files were attached for URL context research.";
  }

  return files
    .map(
      (file, index) =>
        `${index + 1}. ${file.fileName} (${file.contentType ?? "unknown"}) -> ${file.url}`
    )
    .join("\n");
}

function createPrompt(request: EmailAgentRequest, files: PreparedFileContext[]) {
  const senderName = request.sender?.name ?? "the sender";
  const senderCompany = request.sender?.company ?? "the sender's company";
  const contactName = normalizeWhitespace(
    [request.contact?.firstName, request.contact?.lastName].filter(Boolean).join(" ")
  ) || "the recipient";
  const contactCompany = request.contact?.company ?? "their company";
  const contactEmail = request.contact?.email ?? "unknown";

  const sharedContext = [
    `Campaign name: ${request.campaignName}`,
    request.campaignDescription
      ? `Campaign goal: ${request.campaignDescription}`
      : null,
    `Recipient: ${contactName}`,
    `Recipient company: ${contactCompany}`,
    `Recipient email: ${contactEmail}`,
    `Sender name: ${senderName}`,
    `Sender company: ${senderCompany}`,
    "Allowed placeholders: {{first_name}}, {{last_name}}, {{company}}.",
    `Write the sender's real name as ${senderName}; never emit {{sender_name}}.`,
    "The system adds the sign-off automatically; never include one.",
    "Available campaign URL context sources:",
    describeFiles(files),
  ]
    .filter(Boolean)
    .join("\n");

  if (request.mode === "generate") {
    return [
      "Draft a concise cold outreach email.",
      sharedContext,
      "Rules:",
      "- Subject under 50 characters.",
      "- Body uses 3-5 short paragraphs.",
      "- Tone is warm, specific, and professional.",
      "- Use tools only when needed for factual enrichment or attached file context.",
      'Return JSON only: {"subject":"...","body":"..."}',
    ].join("\n\n");
  }

  if (request.writerMode === "prompt") {
    return [
      "Write a cold outreach email from the user brief.",
      sharedContext,
      `User brief: ${request.userInput}`,
      "Rules:",
      "- Subject under 50 characters.",
      "- Body uses 3-5 short paragraphs and one CTA.",
      "- Keep the output concrete and free of filler.",
      'Return JSON only: {"subject":"...","body":"..."}',
    ].join("\n\n");
  }

  return [
    "Polish the user's rough draft into a stronger cold outreach email.",
    sharedContext,
    `User draft:\n${request.userInput}`,
    "Rules:",
    "- Preserve the original intent and specifics.",
    "- Improve clarity, brevity, and persuasiveness.",
    "- Do not invent factual claims.",
    'Return JSON only: {"body":"..."}',
  ].join("\n\n");
}

async function prepareCampaignFiles(files: EmailAgentCampaignFileContext[] = []) {
  const prepared: PreparedFileContext[] = [];

  for (const file of files.slice(0, MAX_FILE_URLS)) {
    const { url, error } = await getCampaignFileUrl(file.storagePath);
    if (error || !url) {
      console.warn("[email-agent] file-url-skip", {
        fileId: file.id,
        fileName: file.fileName,
        error: error ?? "missing-url",
      });
      continue;
    }

    prepared.push({
      id: file.id,
      fileName: file.fileName,
      url,
      contentType: file.contentType,
    });
  }

  return prepared;
}

function createResponseSchema(request: EmailAgentRequest): Schema {
  if (request.mode === "generate" || request.writerMode === "prompt") {
    return {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        body: { type: Type.STRING },
      },
      required: ["subject", "body"],
    };
  }

  return {
    type: Type.OBJECT,
    properties: {
      body: { type: Type.STRING },
      subject: { type: Type.STRING },
    },
    required: ["body"],
  };
}

async function readResponseText(response: GenerateContentResponse) {
  try {
    return response.text?.trim() ?? "";
  } catch {
    return "";
  }
}

async function runGroundedSearch(
  client: GoogleGenAI,
  model: string,
  query: string
) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Use Google Search grounding to collect only current facts that can improve a cold email.",
              `Search query: ${query}`,
              'Return JSON only: {"summary":"...","sources":["..."]}',
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = await readResponseText(response);
  const parsed = JSON.parse(extractJsonObject(raw)) as {
    summary?: string;
    sources?: string[];
  };

  return {
    summary: parsed.summary?.trim() ?? "",
    sources: Array.isArray(parsed.sources)
      ? parsed.sources.filter((item): item is string => typeof item === "string")
      : [],
  };
}

async function runUrlContextResearch(
  client: GoogleGenAI,
  model: string,
  urls: string[],
  focus: string
) {
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Use URL context to read the allowed campaign URLs and summarize only facts relevant to email drafting.",
              `Focus: ${focus}`,
              "URLs:",
              ...urls.map((url) => `- ${url}`),
              'Return JSON only: {"summary":"..."}',
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
      tools: [{ urlContext: {} }],
    },
  });

  const raw = await readResponseText(response);
  const parsed = JSON.parse(extractJsonObject(raw)) as { summary?: string };

  return {
    summary: parsed.summary?.trim() ?? "",
  };
}

function createResearchTools(
  runtime: ModelRuntimeConfig,
  allowedFiles: PreparedFileContext[]
) {
  const client = createGroundingClient(runtime);
  const allowedUrlSet = new Set(allowedFiles.map((file) => file.url));

  const googleSearchTool = new FunctionTool({
    name: "google_search_research",
    description:
      "Run a Google Search grounded research query to improve factual specificity in the email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "A concise factual query to research.",
        },
      },
      required: ["query"],
    },
    execute: async (input) => {
      const query =
        typeof input === "object" &&
        input !== null &&
        "query" in input &&
        typeof input.query === "string"
          ? input.query
          : "";
      const normalizedQuery = normalizeWhitespace(query).slice(0, SEARCH_QUERY_LIMIT);

      console.info("[email-agent] tool-start", {
        tool: "google_search_research",
        query: normalizedQuery,
      });

      if (!normalizedQuery || normalizedQuery.length < 5) {
        return {
          status: "blocked",
          reason: "Search query was too short after guardrails.",
        };
      }

      try {
        const signal = AbortSignal.timeout(TOOL_TIMEOUT_MS);
        void signal;

        const result = await runGroundedSearch(client, runtime.model, normalizedQuery);

        console.info("[email-agent] tool-end", {
          tool: "google_search_research",
          query: normalizedQuery,
          sources: result.sources.length,
        });

        return {
          status: "ok",
          query: normalizedQuery,
          summary: result.summary,
          sources: result.sources,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[email-agent] tool-error", {
          tool: "google_search_research",
          query: normalizedQuery,
          error: message,
        });
        return {
          status: "error",
          query: normalizedQuery,
          error: message,
        };
      }
    },
  });

  const urlContextTool = new FunctionTool({
    name: "campaign_url_context",
    description:
      "Read the allowed campaign URLs or uploaded-file URLs and summarize relevant facts for the email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        urls: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Allowed campaign URLs to read.",
        },
        focus: {
          type: Type.STRING,
          description: "What facts the summary should focus on.",
        },
      },
      required: ["urls", "focus"],
    },
    execute: async (input) => {
      const urls =
        typeof input === "object" && input !== null && "urls" in input && Array.isArray(input.urls)
          ? input.urls.filter((url): url is string => typeof url === "string")
          : [];
      const focus =
        typeof input === "object" &&
        input !== null &&
        "focus" in input &&
        typeof input.focus === "string"
          ? input.focus
          : "";
      const requestedUrls = Array.isArray(urls) ? urls.slice(0, MAX_FILE_URLS) : [];
      const allowedUrls = requestedUrls.filter((url) => allowedUrlSet.has(url));
      const normalizedFocus = normalizeWhitespace(focus).slice(0, SEARCH_QUERY_LIMIT);

      console.info("[email-agent] tool-start", {
        tool: "campaign_url_context",
        requestedUrls,
        allowedUrls,
      });

      if (!allowedUrls.length) {
        return {
          status: "blocked",
          reason: "No allowed campaign URLs were provided.",
        };
      }

      try {
        const signal = AbortSignal.timeout(TOOL_TIMEOUT_MS);
        void signal;

        const result = await runUrlContextResearch(
          client,
          runtime.model,
          allowedUrls,
          normalizedFocus || "Summarize details relevant to a cold email."
        );

        console.info("[email-agent] tool-end", {
          tool: "campaign_url_context",
          urls: allowedUrls,
        });

        return {
          status: "ok",
          urls: allowedUrls,
          focus: normalizedFocus,
          summary: result.summary,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[email-agent] tool-error", {
          tool: "campaign_url_context",
          urls: allowedUrls,
          error: message,
        });
        return {
          status: "error",
          urls: allowedUrls,
          error: message,
        };
      }
    },
  });

  return [googleSearchTool, urlContextTool];
}

function createAgent(request: EmailAgentRequest, files: PreparedFileContext[]) {
  const runtime = getModelRuntimeConfig();
  const tools = createResearchTools(runtime, files);

  return {
    agent: new LlmAgent({
      name: "email_agent",
      model: new Gemini(runtime.geminiParams),
      instruction: [
        "You are a cold email drafting agent.",
        "Use tools only when they materially improve factual specificity or campaign context.",
        "Never invent factual claims, citations, or file contents.",
        "Never reveal raw signed URLs, internal tool names, or tool traces in the final answer.",
        "Keep the email concise, specific, and natural.",
      ].join(" "),
      generateContentConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: createResponseSchema(request),
      },
      tools,
    }),
    runtime,
  };
}

function createRateLimitError(message: string) {
  return new Error(`__RATE_LIMIT__:${message}`);
}

async function enforceAiLimit() {
  const usage = await checkAndIncrementAiUsage();

  if (usage.error) {
    throw new Error(usage.error);
  }

  if (usage.limitExceeded) {
    throw createRateLimitError("Free AI generation limit reached.");
  }
}

async function runAgent(
  request: EmailAgentRequest,
  options: ExecuteOptions = {}
) {
  await enforceAiLimit();

  const files = await prepareCampaignFiles(request.campaignFiles);
  const { agent } = createAgent(request, files);
  const runner = new Runner({
    appName: APP_NAME,
    agent,
    sessionService: new InMemorySessionService(),
  });

  emit(options.onEvent, {
    type: "status",
    message: files.length
      ? "Preparing AI draft with research tools and campaign context."
      : "Preparing AI draft.",
  });

  const streamTextParts: string[] = [];

  for await (const event of runner.runEphemeral({
    userId: "email-agent-user",
    newMessage: createUserContent(createPrompt(request, files)),
    runConfig: {
      streamingMode: options.streaming ? StreamingMode.SSE : StreamingMode.NONE,
    },
  })) {
    handleAgentEvent(event, streamTextParts, options.onEvent);
  }

  emit(options.onEvent, {
    type: "status",
    message: "Finalizing AI response.",
  });

  const result = parseAgentResult(request, streamTextParts.join(""));
  emit(options.onEvent, { type: "final", result });
  return result;
}

function handleAgentEvent(
  event: Event,
  streamTextParts: string[],
  onEvent?: (event: EmailAgentStreamEvent) => void
) {
  for (const structuredEvent of toStructuredEvents(event)) {
    switch (structuredEvent.type) {
      case EventType.THOUGHT:
        emit(onEvent, {
          type: "status",
          message: structuredEvent.content,
        });
        break;
      case EventType.CONTENT:
        streamTextParts.push(structuredEvent.content);
        emit(onEvent, {
          type: "delta",
          delta: structuredEvent.content,
        });
        break;
      case EventType.TOOL_CALL:
        emit(onEvent, {
          type: "tool-start",
          tool: structuredEvent.call.name ?? "unknown_tool",
          args:
            typeof structuredEvent.call.args === "object" &&
            structuredEvent.call.args !== null
              ? (structuredEvent.call.args as Record<string, unknown>)
              : undefined,
        });
        break;
      case EventType.TOOL_RESULT:
        emit(onEvent, {
          type: "tool-end",
          tool: structuredEvent.result.name ?? "unknown_tool",
          result:
            typeof structuredEvent.result.response === "object" &&
            structuredEvent.result.response !== null
              ? (structuredEvent.result.response as Record<string, unknown>)
              : { result: structuredEvent.result.response },
        });
        break;
      case EventType.ERROR:
        throw structuredEvent.error;
      default:
        break;
    }
  }

  if (event.errorMessage) {
    throw new Error(event.errorMessage);
  }
}

export async function executeEmailAgent(
  request: EmailAgentRequest,
  options: ExecuteOptions = {}
) {
  try {
    return await runAgent(request, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    emit(options.onEvent, { type: "error", error: message });
    throw error;
  }
}
