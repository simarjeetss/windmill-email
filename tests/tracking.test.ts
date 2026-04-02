import { describe, it, expect, beforeAll } from "vitest";
import {
  buildClickSignature,
  buildOpenSignature,
  classifyOpenRequest,
  verifyClickSignature,
  verifyOpenSignature,
} from "@/lib/email/tracking";

beforeAll(() => {
  process.env.TRACKING_SECRET = "test-tracking-secret-for-vitest";
});

describe("tracking signatures", () => {
  it("round-trips open signature", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const ts = Math.floor(Date.now() / 1000);
    const sig = buildOpenSignature(id, ts);
    expect(verifyOpenSignature(id, ts, sig)).toBe(true);
    expect(verifyOpenSignature(id, ts, sig + "x")).toBe(false);
  });

  it("round-trips click signature for target URL", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const ts = Math.floor(Date.now() / 1000);
    const target = "https://example.com/path?q=1";
    const sig = buildClickSignature(id, ts, target);
    expect(verifyClickSignature(id, ts, target, sig)).toBe(true);
    expect(verifyClickSignature(id, ts, "https://evil.com", sig)).toBe(false);
  });

  it("classifies empty user agent as low confidence", () => {
    const r = classifyOpenRequest(null);
    expect(r.isSuspectedBot).toBe(true);
    expect(r.confidence).toBeLessThan(0.5);
  });
});
