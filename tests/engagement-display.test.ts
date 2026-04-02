import { describe, it, expect } from "vitest";
import { buildEngagementDisplayFromEvents } from "@/lib/analytics/metrics";

describe("buildEngagementDisplayFromEvents", () => {
  it("falls back to sent_emails columns when no events", () => {
    const d = buildEngagementDisplayFromEvents(
      { opened_at: "2024-01-02T00:00:00.000Z", clicked_at: null },
      undefined
    );
    expect(d.opened_at_display).toBe("2024-01-02T00:00:00.000Z");
    expect(d.clicked_at_display).toBeNull();
  });

  it("uses trusted opens only when events exist", () => {
    const d = buildEngagementDisplayFromEvents(
      { opened_at: "2024-01-01T00:00:00.000Z", clicked_at: null },
      [
        {
          event_type: "open",
          occurred_at: "2024-01-03T00:00:00.000Z",
          is_suspected_bot: true,
        },
        {
          event_type: "open",
          occurred_at: "2024-01-04T12:00:00.000Z",
          is_suspected_bot: false,
        },
      ]
    );
    expect(d.opened_at_display).toBe("2024-01-04T12:00:00.000Z");
  });

  it("returns null opened when only bot opens exist", () => {
    const d = buildEngagementDisplayFromEvents(
      { opened_at: "2024-01-01T00:00:00.000Z", clicked_at: null },
      [{ event_type: "open", occurred_at: "2024-01-03T00:00:00.000Z", is_suspected_bot: true }]
    );
    expect(d.opened_at_display).toBeNull();
  });
});
