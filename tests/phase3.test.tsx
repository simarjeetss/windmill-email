/**
 * Phase 3 Tests — AI Email Generation
 *
 * Suites:
 *  1. generateEmailWithAI — mock-call assertions
 *  2. getAllTemplates      — returns empty, returns data, returns error
 *  3. createTemplate      — validates, inserts, error on DB failure
 *  4. EmailComposer UI    — renders, AI generate, save, variable chips, preview tab
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { EmailTemplate } from "@/lib/supabase/email-templates";
import type { Contact } from "@/lib/supabase/campaigns";

// ─── Module-level mocks ────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/dashboard"),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock the server actions used by EmailComposer
const mockGenerateEmailWithAI = vi.fn();
const mockCreateTemplate      = vi.fn();
const mockGetAllTemplates     = vi.fn();
const mockPolishEmailWithAI   = vi.fn();

vi.mock("@/lib/ai/generate-email", () => ({
  generateEmailWithAI: (...args: unknown[]) => mockGenerateEmailWithAI(...args),
}));
vi.mock("@/lib/ai/polish-email", () => ({
  polishEmailWithAI: (...args: unknown[]) => mockPolishEmailWithAI(...args),
}));
vi.mock("@/lib/supabase/email-templates", () => ({
  createTemplate:  (...args: unknown[]) => mockCreateTemplate(...args),
  getAllTemplates:  (...args: unknown[]) => mockGetAllTemplates(...args),
}));

// ─── Static imports (after mocks) ─────────────────────────────────────────────

import EmailComposer from "@/components/campaigns/email-composer";
import { generateEmailWithAI } from "@/lib/ai/generate-email";
import { createTemplate, getAllTemplates } from "@/lib/supabase/email-templates";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id:          "tmpl-1",
    name:        "My Template",
    user_id:     "user-1",
    subject:     "Hello {{first_name}}",
    body:        "Hi {{first_name}}, welcome to {{company}}.",
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
    ...overrides,
  };
}

function makeContacts(n: number): Contact[] {
  return Array.from({ length: n }, (_, i) => ({
    id:          `c-${i}`,
    campaign_id: "camp-1",
    user_id:     "user-1",
    email:       `alice${i}@example.com`,
    first_name:  `Alice${i}`,
    last_name:   `Smith${i}`,
    company:     `Acme${i}`,
    created_at:  new Date().toISOString(),
  }));
}

function renderComposer(opts: {
  template?: EmailTemplate | null;
  contacts?: Contact[];
  profile?: import("@/lib/supabase/profile").UserProfile | null;
} = {}) {
  render(
    <EmailComposer
      campaignId="camp-1"
      campaignName="Winter Sale"
      campaignDescription="Our annual sale."
      initialTemplate={opts.template ?? null}
      previewContacts={opts.contacts ?? makeContacts(2)}
      initialProfile={opts.profile ?? null}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — generateEmailWithAI call behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe("generateEmailWithAI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is called with campaignName", async () => {
    mockGenerateEmailWithAI.mockResolvedValueOnce({ subject: "S", body: "B" });
    await generateEmailWithAI({ campaignName: "Test Camp" });
    expect(mockGenerateEmailWithAI).toHaveBeenCalledWith(
      expect.objectContaining({ campaignName: "Test Camp" })
    );
  });

  it("passes optional contact fields when provided", async () => {
    mockGenerateEmailWithAI.mockResolvedValueOnce({ subject: "Hi", body: "Body" });
    await generateEmailWithAI({
      campaignName: "Camp",
      contactFirstName: "Alice",
      contactCompany: "Acme",
    });
    expect(mockGenerateEmailWithAI).toHaveBeenCalledWith(
      expect.objectContaining({ contactFirstName: "Alice", contactCompany: "Acme" })
    );
  });

  it("returns subject and body on success", async () => {
    mockGenerateEmailWithAI.mockResolvedValueOnce({ subject: "Great!", body: "Hello {{first_name}}" });
    const result = await generateEmailWithAI({ campaignName: "Launch" });
    expect((result as { subject: string }).subject).toBe("Great!");
    expect((result as { body: string }).body).toBe("Hello {{first_name}}");
  });

  it("returns an error field on failure", async () => {
    mockGenerateEmailWithAI.mockResolvedValueOnce({ subject: "", body: "", error: "API key missing" });
    const result = await generateEmailWithAI({ campaignName: "Fail" });
    expect((result as { error: string }).error).toBe("API key missing");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — getAllTemplates
// ─────────────────────────────────────────────────────────────────────────────

describe("getAllTemplates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no templates exist", async () => {
    mockGetAllTemplates.mockResolvedValueOnce({ data: [], error: null });
    const result = await getAllTemplates();
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("returns template data when templates exist", async () => {
    const tmpl = makeTemplate();
    mockGetAllTemplates.mockResolvedValueOnce({ data: [tmpl], error: null });
    const result = await getAllTemplates();
    expect(result.data?.[0]?.subject).toBe(tmpl.subject);
    expect(result.data?.[0]?.body).toBe(tmpl.body);
  });

  it("returns error string on DB failure", async () => {
    mockGetAllTemplates.mockResolvedValueOnce({ data: [], error: "Connection refused" });
    const result = await getAllTemplates();
    expect(result.error).toBe("Connection refused");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — createTemplate
// ─────────────────────────────────────────────────────────────────────────────

describe("createTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when subject is empty", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ data: null, error: "Subject is required." });
    const result = await createTemplate("My Template", "", "body text");
    expect(result.error).toBeTruthy();
  });

  it("returns error when body is empty", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ data: null, error: "Body is required." });
    const result = await createTemplate("My Template", "Subject", "");
    expect(result.error).toBeTruthy();
  });

  it("returns null error on successful save", async () => {
    const tmpl = makeTemplate({ subject: "Great subject", body: "Body text here" });
    mockCreateTemplate.mockResolvedValueOnce({ data: tmpl, error: null });
    const result = await createTemplate("My Template", "Great subject", "Body text here");
    expect(result.error).toBeNull();
    expect(result.data?.subject).toBe("Great subject");
  });

  it("returns error when DB insert fails", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ data: null, error: "DB constraint" });
    const result = await createTemplate("My Template", "Subject", "Body");
    expect(result.error).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — EmailComposer UI
// ─────────────────────────────────────────────────────────────────────────────

describe("EmailComposer", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Rendering ─────────────────────────────────────────────────────────────

  it("renders subject input and body textarea", () => {
    renderComposer();
    expect(screen.getByRole("textbox", { name: /email subject/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email body/i })).toBeInTheDocument();
  });

  it("pre-fills fields from initialTemplate", () => {
    renderComposer({ template: makeTemplate({ subject: "Pre-filled subject", body: "Pre-filled body" }) });
    expect(screen.getByDisplayValue("Pre-filled subject")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pre-filled body")).toBeInTheDocument();
  });

  it("renders Generate with AI button", () => {
    renderComposer();
    expect(screen.getByRole("button", { name: /generate with ai/i })).toBeInTheDocument();
  });

  it("renders Save template button", () => {
    renderComposer();
    expect(screen.getByRole("button", { name: /save template/i })).toBeInTheDocument();
  });

  it("renders Compose and Preview tabs", () => {
    renderComposer();
    expect(screen.getByRole("button", { name: /compose/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview/i })).toBeInTheDocument();
  });

  it("does NOT mention any AI company name in the UI", () => {
    renderComposer();
    expect(screen.queryByText(/openai/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gemini/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anthropic/i)).not.toBeInTheDocument();
  });

  // ── Variable chips ────────────────────────────────────────────────────────

  it("renders all variable insert chips", () => {
    renderComposer();
    expect(screen.getByRole("button", { name: "{{first_name}}" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "{{last_name}}"  })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "{{company}}"    })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "{{sender_name}}"})).toBeInTheDocument();
  });

  it("appends variable to body when chip is clicked", async () => {
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i }) as HTMLTextAreaElement;
    await userEvent.clear(bodyEl);
    await userEvent.type(bodyEl, "Hello ");
    await userEvent.click(screen.getByRole("button", { name: "{{first_name}}" }));
    expect(bodyEl.value).toContain("{{first_name}}");
  });

  // ── Character counter ─────────────────────────────────────────────────────

  it("shows character count for subject", async () => {
    renderComposer();
    const subjectEl = screen.getByRole("textbox", { name: /email subject/i });
    await userEvent.clear(subjectEl);
    await userEvent.type(subjectEl, "Hello");
    expect(screen.getByText("5/60")).toBeInTheDocument();
  });

  // ── Save button state ─────────────────────────────────────────────────────

  it("Save template is disabled when form is not dirty", () => {
    renderComposer({ template: makeTemplate() });
    expect(screen.getByRole("button", { name: /save template/i })).toBeDisabled();
  });

  it("Save template is enabled after editing subject", async () => {
    renderComposer({ template: makeTemplate({ subject: "Old", body: "Old body" }) });
    await userEvent.type(screen.getByRole("textbox", { name: /email subject/i }), "x");
    expect(screen.getByRole("button", { name: /save template/i })).not.toBeDisabled();
  });

  // ── AI Generation ─────────────────────────────────────────────────────────

  it("calls generateEmailWithAI and populates fields on success", async () => {
    mockGenerateEmailWithAI.mockResolvedValueOnce({ subject: "AI Subject", body: "AI body text" });
    renderComposer();
    await userEvent.click(screen.getByRole("button", { name: /generate with ai/i }));
    await waitFor(() => expect(mockGenerateEmailWithAI).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByDisplayValue("AI Subject")).toBeInTheDocument());
    expect(screen.getByDisplayValue("AI body text")).toBeInTheDocument();
  });

  it("shows error when AI generation returns an error", async () => {
    mockGenerateEmailWithAI.mockResolvedValueOnce({ subject: "", body: "", error: "API key invalid" });
    renderComposer();
    await userEvent.click(screen.getByRole("button", { name: /generate with ai/i }));
    await waitFor(() => expect(screen.getByText(/API key invalid/i)).toBeInTheDocument());
  });

  // ── Save Template ─────────────────────────────────────────────────────────

  it("calls createTemplate when Save button is clicked and name is confirmed", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ data: makeTemplate(), error: null });
    renderComposer();
    await userEvent.type(screen.getByRole("textbox", { name: /email subject/i }), "New subject");
    await userEvent.type(screen.getByRole("textbox", { name: /email body/i }), "Some body text");
    await userEvent.click(screen.getByRole("button", { name: /save template/i }));
    // Modal should open — type a name and confirm
    await waitFor(() => expect(screen.getByRole("textbox", { name: /template name/i })).toBeInTheDocument());
    await userEvent.type(screen.getByRole("textbox", { name: /template name/i }), "My Template");
    await userEvent.click(screen.getByRole("button", { name: /confirm save template/i }));
    await waitFor(() => expect(mockCreateTemplate).toHaveBeenCalledOnce());
  });

  it("shows Template saved confirmation after successful save", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ data: makeTemplate(), error: null });
    renderComposer();
    await userEvent.type(screen.getByRole("textbox", { name: /email subject/i }), "My subject");
    await userEvent.type(screen.getByRole("textbox", { name: /email body/i }), "Some body text");
    await userEvent.click(screen.getByRole("button", { name: /save template/i }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: /template name/i })).toBeInTheDocument());
    await userEvent.type(screen.getByRole("textbox", { name: /template name/i }), "My Template");
    await userEvent.click(screen.getByRole("button", { name: /confirm save template/i }));
    await waitFor(() => expect(screen.getByText(/template saved/i)).toBeInTheDocument());
  });

  it("shows error message when save fails", async () => {
    mockCreateTemplate.mockResolvedValueOnce({ data: null, error: "Database error" });
    renderComposer();
    await userEvent.type(screen.getByRole("textbox", { name: /email subject/i }), "My subject");
    await userEvent.type(screen.getByRole("textbox", { name: /email body/i }), "Some body text");
    await userEvent.click(screen.getByRole("button", { name: /save template/i }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: /template name/i })).toBeInTheDocument());
    await userEvent.type(screen.getByRole("textbox", { name: /template name/i }), "My Template");
    await userEvent.click(screen.getByRole("button", { name: /confirm save template/i }));
    await waitFor(() => expect(screen.getByText(/database error/i)).toBeInTheDocument());
  });

  // ── Preview tab ───────────────────────────────────────────────────────────

  it("switches to Preview tab on click", async () => {
    renderComposer({ template: makeTemplate() });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => expect(screen.getByText(/subject/i)).toBeInTheDocument());
  });

  it("substitutes {{first_name}} with contact name in preview", async () => {
    renderComposer({
      template: makeTemplate({ subject: "Hello {{first_name}}", body: "Dear {{first_name}}" }),
      contacts: makeContacts(1),
    });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => expect(screen.getByText("Hello Alice0")).toBeInTheDocument());
  });

  it("substitutes {{company}} in preview body", async () => {
    renderComposer({
      template: makeTemplate({ subject: "Hi", body: "Welcome {{company}}!" }),
      contacts: makeContacts(1),
    });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => expect(screen.getByText(/Welcome Acme0!/i)).toBeInTheDocument());
  });

  it("shows contact picker buttons in preview tab", async () => {
    renderComposer({ contacts: makeContacts(3) });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Alice0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Alice2" })).toBeInTheDocument();
    });
  });

  it("shows empty-body message when no body is set", async () => {
    renderComposer({ template: makeTemplate({ subject: "Sub", body: "" }), contacts: [] });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => expect(screen.getByText(/no body yet/i)).toBeInTheDocument());
  });

  it("shows hint to add contacts when contact list is empty", async () => {
    renderComposer({ contacts: [] });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => expect(screen.getByText(/add contacts/i)).toBeInTheDocument());
  });

  it("shows variable legend for selected contact", async () => {
    renderComposer({ template: makeTemplate(), contacts: makeContacts(2) });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => expect(screen.getByText("{{first_name}}")).toBeInTheDocument());
  });

  it("switches preview contact when a picker button is clicked", async () => {
    renderComposer({ template: makeTemplate({ subject: "Hi {{first_name}}" }), contacts: makeContacts(3) });
    await userEvent.click(screen.getByRole("button", { name: /preview/i }));
    await waitFor(() => screen.getByRole("button", { name: "Alice1" }));
    await userEvent.click(screen.getByRole("button", { name: "Alice1" }));
    await waitFor(() => expect(screen.getByText("Hi Alice1")).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — AI Writer Panel (/ command)
// ─────────────────────────────────────────────────────────────────────────────

describe("AI Writer Panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the AI writer panel when / is typed in an empty body", async () => {
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() =>
      expect(screen.getByText(/write with ai/i)).toBeInTheDocument()
    );
  });

  it("closes the AI writer panel when the close button is clicked", async () => {
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() => screen.getByRole("textbox", { name: /ai writer prompt/i }));
    await userEvent.click(screen.getByRole("button", { name: /close ai writer/i }));
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: /ai writer prompt/i })).not.toBeInTheDocument()
    );
  });

  it("shows both mode buttons: From prompt and Polish draft", async () => {
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() => screen.getByText(/write with ai/i));
    expect(screen.getByRole("button", { name: /from prompt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /polish draft/i })).toBeInTheDocument();
  });

  it("Generate button is disabled when prompt textarea is empty", async () => {
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() => screen.getByText(/write with ai/i));
    expect(screen.getByRole("button", { name: /ai writer generate/i })).toBeDisabled();
  });

  it("calls polishEmailWithAI in prompt mode and populates body", async () => {
    mockPolishEmailWithAI.mockResolvedValueOnce({ body: "Generated body text", subject: "Gen Subject" });
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() => screen.getByRole("textbox", { name: /ai writer prompt/i }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /ai writer prompt/i }),
      "cold outreach for SaaS product"
    );
    await userEvent.click(screen.getByRole("button", { name: /ai writer generate/i }));
    await waitFor(() => expect(mockPolishEmailWithAI).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "prompt", userInput: "cold outreach for SaaS product" })
    ));
    await waitFor(() =>
      expect(screen.queryByText(/write with ai/i)).not.toBeInTheDocument()
    );
    expect(screen.getByDisplayValue("Generated body text")).toBeInTheDocument();
  });

  it("calls polishEmailWithAI in polish mode", async () => {
    mockPolishEmailWithAI.mockResolvedValueOnce({ body: "Polished body text" });
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() => screen.getByRole("button", { name: /polish draft/i }));
    await userEvent.click(screen.getByRole("button", { name: /polish draft/i }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /ai writer prompt/i }),
      "my rough draft text here"
    );
    await userEvent.click(screen.getByRole("button", { name: /ai writer polish/i }));
    await waitFor(() => expect(mockPolishEmailWithAI).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "polish" })
    ));
  });

  it("shows error when polishEmailWithAI returns an error", async () => {
    mockPolishEmailWithAI.mockResolvedValueOnce({ body: "", error: "Quota exceeded" });
    renderComposer();
    const bodyEl = screen.getByRole("textbox", { name: /email body/i });
    await userEvent.type(bodyEl, "/");
    await waitFor(() => screen.getByRole("textbox", { name: /ai writer prompt/i }));
    await userEvent.type(
      screen.getByRole("textbox", { name: /ai writer prompt/i }),
      "some prompt"
    );
    await userEvent.click(screen.getByRole("button", { name: /ai writer generate/i }));
    await waitFor(() => expect(screen.getByText(/quota exceeded/i)).toBeInTheDocument());
  });
});
