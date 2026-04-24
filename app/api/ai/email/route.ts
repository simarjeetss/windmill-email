import { NextResponse } from "next/server";

import { executeEmailAgent } from "@/lib/ai/email-agent.service";
import type {
  EmailAgentRequest,
  EmailAgentStreamEvent,
} from "@/lib/ai/email-agent.types";

export const dynamic = "force-dynamic";

function encodeSseEvent(event: EmailAgentStreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as EmailAgentRequest;

  if (!body?.mode || !body?.campaignName) {
    return NextResponse.json(
      { error: "Missing required AI request payload." },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: EmailAgentStreamEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      try {
        await executeEmailAgent(body, {
          streaming: true,
          onEvent: send,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}