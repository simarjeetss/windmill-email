import { inngest } from "@/lib/inngest/client";
import { markRunFailed, processCampaignSendRun } from "@/lib/campaign-send/service";

type CampaignSendRequestedEvent = {
  name: "campaign/send.requested";
  data: {
    runId: string;
    userId: string;
    campaignId: string;
  };
};

export const campaignSendRequested = inngest.createFunction(
  {
    id: "campaign-send-requested",
    retries: 3,
    concurrency: [
      {
        key: "event.data.userId",
        limit: 1,
      },
      {
        key: "event.data.runId",
        limit: 1,
      },
    ],
    triggers: [{ event: "campaign/send.requested" }],
  },
  async ({ event, step }: { event: CampaignSendRequestedEvent; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const payload = event as CampaignSendRequestedEvent;
    await step.run("process-campaign-send-run", async () => {
      try {
        await processCampaignSendRun(payload.data.runId);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown campaign send failure.";
        await markRunFailed(payload.data.runId, msg);
        throw error;
      }
    });
    return { ok: true, runId: payload.data.runId };
  }
);
