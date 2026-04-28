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
const DEFAULT_MODEL = process.env.GOOGLE_GENAI_MODEL ?? "gemini-3-flash-preview";
const MAX_FILE_URLS = Number.parseInt(
  process.env.EMAIL_AGENT_MAX_FILE_URLS ?? "3",
  10
);
const TOOL_TIMEOUT_MS = Number.parseInt(
  process.env.EMAIL_AGENT_TOOL_TIMEOUT_MS ?? "15000",
  10
);
const SEARCH_QUERY_LIMIT = 180;

function defaultVertexLocationForModel(model: string) {
  // Gemini 3 family models on Vertex are commonly exposed in global first.
  if (model.startsWith("gemini-3")) {
    return "global";
  }

  return "us-central1";
}

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
  const location =
    process.env.GOOGLE_CLOUD_LOCATION ?? defaultVertexLocationForModel(DEFAULT_MODEL);
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

function extractJsonObjects(value: string) {
  const clean = stripCodeFences(value);

  const jsonObjects: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];

    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
        inString = false;
        escape = false;
      }
      continue;
    }

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }

      if (char === "\\") {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        jsonObjects.push(clean.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return jsonObjects;
}

function parseLastJsonRecord(value: string): Record<string, unknown> {
  const parsedCandidates = extractJsonObjects(value);
  const parseQueue =
    parsedCandidates.length > 0 ? parsedCandidates : [stripCodeFences(value)];

  for (let index = parseQueue.length - 1; index >= 0; index -= 1) {
    try {
      const candidate = JSON.parse(parseQueue[index]) as Record<string, unknown>;
      if (candidate && typeof candidate === "object") {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  throw new Error("AI returned malformed JSON.");
}

function parseAgentResult(
  request: EmailAgentRequest,
  rawText: string
): EmailAgentFinalResult {
  const parsed = parseLastJsonRecord(rawText);

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
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = await readResponseText(response);
  const parsed = parseLastJsonRecord(raw) as {
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
      toolConfig: {
        includeServerSideToolInvocations: true,
      },
      tools: [{ urlContext: {} }],
    },
  });

  const raw = await readResponseText(response);
  const parsed = parseLastJsonRecord(raw) as { summary?: string };

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

function createAgent(files: PreparedFileContext[]) {
  const runtime = getModelRuntimeConfig();
  const tools = createResearchTools(runtime, files);

  return {
    agent: new LlmAgent({
      name: "email_agent",
      model: new Gemini(runtime.geminiParams),
      instruction: [
        "You are the outbound email strategist and copywriter for WinSun Green (WinSun).",
        "Primary mission: write high-converting B2B outreach emails for bulk campaigns while keeping every message personalized and trustworthy.",
        "Company context to ground messaging: WinSun Green is a renewable energy solutions provider in India, with strong experience in wind energy, and offers O&M/OMS and EPC turnkey project support.",
        "Operational context you can reference when relevant: project planning, technical consultancy, project execution, maintenance services, and end-to-end support for renewable projects.",
        "Business focus from user context: WinSun Green also buys and sells wind energy assets.",
        "Campaign objective: open conversations with relevant decision-makers, qualify fit, and move prospects toward a clear next step (reply, meeting, or call).",
        "For bulk outreach, maintain a consistent strategy but vary wording naturally so emails do not feel templated.",
        "Personalization rules: anchor each email to recipient role, company context, and likely business pain points when available.",
        "Value proposition rules: emphasize practical outcomes such as reliability, execution capability, project support quality, and long-term partnership value.",
        "Credibility rules: only use facts present in provided context, approved tools, or user input.",
        "Never invent company metrics, project history, customer names, pricing, guarantees, certifications, or claims that were not provided.",
        "Use tools only when they materially improve factual specificity or campaign context.",
        "Never reveal raw signed URLs, internal tool names, or tool traces in the final answer.",
        "Compliance rules: avoid spammy language, exaggerated promises, manipulative urgency, and unsupported ROI guarantees.",
        "Tone rules: professional, clear, confident, and human; concise enough for busy business readers.",
        "Structure rules: strong hook, clear value, concrete relevance, and one specific CTA.",
        "Do not include signatures or sign-offs in the generated body.",
        "Return only the requested JSON shape from the user prompt. Do not add markdown, commentary, or extra keys.",
      ].join(" "),
      generateContentConfig: {
        temperature: 0.5,
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
  const { agent } = createAgent(files);
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
