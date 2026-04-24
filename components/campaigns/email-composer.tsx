"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createTemplate } from "@/lib/supabase/email-templates";
import {
  enqueueCampaignSend,
  getFollowUpAudienceCount,
  getFollowUpAudiencePreview,
} from "@/lib/supabase/sent-emails";
import {
  followUpSegmentLabel,
  type LatestContactStatus,
  type FollowUpSegment,
} from "@/lib/campaign-send/follow-up";
import {
  MAX_TEMPLATE_ATTACHMENTS,
  type TemplateAttachment,
} from "@/lib/supabase/template-attachments.types";
import {
  uploadTemplateAttachment,
  deleteTemplateAttachment,
  getTemplateAttachments,
} from "@/lib/supabase/template-attachments";
import type {
  EmailAgentCampaignFileContext,
  EmailAgentFinalResult,
  EmailAgentRequest,
  EmailAgentStreamEvent,
} from "@/lib/ai/email-agent.types";
import type { EmailTemplate } from "@/lib/supabase/email-templates";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";
import type {
  CampaignSendRun,
  FollowUpAudiencePreviewContact,
} from "@/lib/campaign-send/service";
import SenderProfileSheet from "@/components/campaigns/sender-profile-sheet";
import TemplateLibrary from "@/components/campaigns/template-library";
import SendRunStatus from "@/components/campaigns/send-run-status";

type FollowUpIntent = {
  segment: FollowUpSegment;
  nonce: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────


/** Variables that relate to the contact (recipient) */
const CONTACT_VARIABLES = ["{{first_name}}", "{{last_name}}", "{{company}}"];

/** Sender variables — resolved from profile, shown with resolved value */
const SENDER_VARIABLES = ["{{sender_name}}", "{{sender_company}}"];

const FOLLOW_UP_SEGMENTS: Array<{
  value: FollowUpSegment;
  description: string;
}> = [
  { value: "failed", description: "Retry people whose latest send failed." },
  { value: "opened", description: "Target people who opened but did not click." },
  { value: "clicked", description: "Target the most engaged recipients." },
  { value: "sent_all", description: "Include all successful sends, even if they opened or clicked." },
  { value: "sent_unengaged", description: "Only include successful sends with no open or click yet." },
];

const FOLLOW_UP_STATUS_STYLES: Record<LatestContactStatus, { bg: string; color: string }> = {
  clicked: { bg: "rgba(139,92,246,0.12)", color: "#8b5cf6" },
  opened: { bg: "rgba(37,99,235,0.12)", color: "#2563eb" },
  sent: { bg: "rgba(43,122,95,0.12)", color: "var(--wm-accent)" },
  failed: { bg: "rgba(220,38,38,0.12)", color: "#dc2626" },
  pending: { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
};

function toolLabel(tool: string): string {
  if (tool === "google_search_research") return "Google Search";
  if (tool === "campaign_url_context") return "URL Context";
  return tool;
}

async function streamEmailAgentRequest(
  payload: EmailAgentRequest,
  onEvent: (event: EmailAgentStreamEvent) => void
): Promise<EmailAgentFinalResult> {
  const response = await fetch("/api/ai/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("AI response stream was unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: EmailAgentFinalResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((entry) => entry.startsWith("data: "));

      if (!line) {
        continue;
      }

      const event = JSON.parse(line.slice(6)) as EmailAgentStreamEvent;
      onEvent(event);

      if (event.type === "error") {
        throw new Error(event.error);
      }

      if (event.type === "final") {
        finalResult = event.result;
      }
    }
  }

  if (!finalResult) {
    throw new Error("AI did not return a final result.");
  }

  return finalResult;
}

function applyPreview(
  text: string,
  contact: Contact | null,
  profile: UserProfile | null
): string {
  const senderName    = profile?.full_name || "You";
  const senderCompany = profile?.company   || "Your Company";

  let out = text;
  if (contact) {
    out = out
      .replace(/\{\{first_name\}\}/g, contact.first_name ?? "there")
      .replace(/\{\{last_name\}\}/g,  contact.last_name  ?? "")
      .replace(/\{\{company\}\}/g,    contact.company    ?? "their company");
  }
  out = out
    .replace(/\{\{sender_name\}\}/g,    senderName)
    .replace(/\{\{sender_company\}\}/g, senderCompany);
  return out;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailComposer({
  campaignId,
  campaignName,
  campaignDescription,
  initialTemplate,
  previewContacts,
  initialProfile,
  campaignFiles,
  initialLatestRun,
  followUpIntent,
}: {
  campaignId: string;
  campaignName: string;
  campaignDescription?: string | null;
  initialTemplate: EmailTemplate | null;
  previewContacts: Contact[];
  initialProfile: UserProfile | null;
  campaignFiles: EmailAgentCampaignFileContext[];
  initialLatestRun: CampaignSendRun | null;
  followUpIntent: FollowUpIntent | null;
}) {
  const [subject,      setSubject]     = useState(initialTemplate?.subject ?? "");
  const [body,         setBody]        = useState(initialTemplate?.body    ?? "");
  const [savedSubject, setSavedSubject] = useState(initialTemplate?.subject ?? "");
  const [savedBody,    setSavedBody]   = useState(initialTemplate?.body    ?? "");
  const [tab,          setTab]         = useState<"compose" | "preview">("compose");
  const [previewIdx,   setPreviewIdx]  = useState(0);
  const [saveStatus,   setSaveStatus]  = useState<"idle" | "saved" | "error">("idle");
  const [saveError,    setSaveError]   = useState("");
  const [aiError,      setAiError]     = useState("");
  const [aiStatus,     setAiStatus]    = useState("");
  const [aiActivity,   setAiActivity]  = useState<string[]>([]);
  const [isSaving,     startSave]      = useTransition();
  const [isGenerating, startGenerate]  = useTransition();
  const [isSending,    startSend]      = useTransition();
  const [profile,      setProfile]     = useState<UserProfile | null>(initialProfile);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const composerRootRef = useRef<HTMLDivElement>(null);

  // Save-as modal state
  const [showSaveModal,   setShowSaveModal]   = useState(false);
  const [templateName,    setTemplateName]    = useState("");
  const [saveModalError,  setSaveModalError]  = useState("");
  const templateNameRef = useRef<HTMLInputElement>(null);

  // Send-now modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "queued" | "error">("idle");
  const [latestRun, setLatestRun] = useState<CampaignSendRun | null>(initialLatestRun);
  const [sendMode, setSendMode] = useState<"initial" | "followup">("initial");
  const [followUpSegment, setFollowUpSegment] = useState<FollowUpSegment>("failed");
  const [followUpCount, setFollowUpCount] = useState<number | null>(null);
  const [followUpAudienceError, setFollowUpAudienceError] = useState("");
  const [isLoadingFollowUpCount, setIsLoadingFollowUpCount] = useState(false);
  const [showFollowUpReview, setShowFollowUpReview] = useState(false);
  const [followUpPreview, setFollowUpPreview] = useState<FollowUpAudiencePreviewContact[]>([]);
  const [isLoadingFollowUpPreview, setIsLoadingFollowUpPreview] = useState(false);

  /** Files linked to the current draft (saved template and/or staged uploads). */
  const [attachments, setAttachments] = useState<TemplateAttachment[]>([]);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
  const [savedAttachSig, setSavedAttachSig] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachError, setAttachError] = useState("");
  const [isUploadingAttach, setIsUploadingAttach] = useState(false);

  // AI rate-limit upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    setLatestRun(initialLatestRun);
  }, [initialLatestRun]);

  useEffect(() => {
    if (sendMode !== "followup") {
      setFollowUpCount(null);
      setFollowUpAudienceError("");
      setIsLoadingFollowUpCount(false);
      return;
    }

    let cancelled = false;

    async function loadFollowUpAudience() {
      setIsLoadingFollowUpCount(true);
      setFollowUpAudienceError("");

      const result = await getFollowUpAudienceCount(campaignId, followUpSegment);
      if (cancelled) return;

      if (result.error) {
        setFollowUpAudienceError(result.error);
        setFollowUpCount(0);
      } else {
        setFollowUpAudienceError("");
        setFollowUpCount(result.count);
      }

      setIsLoadingFollowUpCount(false);
    }

    void loadFollowUpAudience();

    return () => {
      cancelled = true;
    };
  }, [campaignId, followUpSegment, sendMode]);

  useEffect(() => {
    if (!followUpIntent) return;

    setSendMode("followup");
    setFollowUpSegment(followUpIntent.segment);
    setTab("compose");
    setShowFollowUpReview(true);
    setShowSendModal(false);
    setSendStatus("idle");
    setSendError("");

    requestAnimationFrame(() => {
      composerRootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      bodyRef.current?.focus();
    });
  }, [followUpIntent]);

  useEffect(() => {
    if (sendMode !== "followup" || !showFollowUpReview) {
      setFollowUpPreview([]);
      setIsLoadingFollowUpPreview(false);
      return;
    }

    let cancelled = false;

    async function loadFollowUpPreview() {
      setIsLoadingFollowUpPreview(true);
      const result = await getFollowUpAudiencePreview(campaignId, followUpSegment);
      if (cancelled) return;

      if (result.error) {
        setFollowUpAudienceError(result.error);
        setFollowUpPreview([]);
      } else {
        setFollowUpPreview(result.contacts);
      }

      setIsLoadingFollowUpPreview(false);
    }

    void loadFollowUpPreview();

    return () => {
      cancelled = true;
    };
  }, [campaignId, followUpSegment, sendMode, showFollowUpReview]);

  // Focus name input when modal opens
  useEffect(() => {
    if (showSaveModal) {
      setSaveModalError("");
      setTimeout(() => templateNameRef.current?.focus(), 60);
    }
  }, [showSaveModal]);

  const previewContact  = previewContacts[previewIdx] ?? null;
  const attachSig = attachments.map((a) => a.id).sort().join(",");
  const isDirty =
    subject !== savedSubject ||
    body !== savedBody ||
    attachSig !== savedAttachSig;

  const senderName    = profile?.full_name || null;
  const senderCompany = profile?.company   || null;
  const profileMissing = !senderName;

  // Insert variable at cursor in body textarea
  function insertVariable(v: string) {
    const el = bodyRef.current;
    if (!el) { setBody((b) => b + v); return; }
    const start = el.selectionStart ?? body.length;
    const end   = el.selectionEnd   ?? body.length;
    const next  = body.slice(0, start) + v + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  }

  function handleSave() {
    if (!subject.trim() || !body.trim()) {
      setSaveStatus("error");
      setSaveError(!subject.trim() ? "Subject is required before saving." : "Body is required before saving.");
      return;
    }
    setTemplateName("");
    setSaveModalError("");
    setShowSaveModal(true);
  }

  function handleSaveModalKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setShowSaveModal(false); }
    if (e.key === "Enter")  { handleConfirmSave(); }
  }

  function handleConfirmSave() {
    if (!templateName.trim()) { setSaveModalError("Please enter a name for this template."); return; }
    setSaveModalError("");
    startSave(async () => {
      const { data: created, error } = await createTemplate(
        templateName.trim(),
        subject,
        body,
        attachments.map((a) => a.id)
      );
      if (error) { setSaveModalError(error); return; }
      setShowSaveModal(false);
      setSaveStatus("saved");
      setSavedSubject(subject);
      setSavedBody(body);
      if (created) {
        setLoadedTemplateId(created.id);
        const { data: refreshed } = await getTemplateAttachments(created.id);
        setAttachments(refreshed ?? []);
        setSavedAttachSig((refreshed ?? []).map((a) => a.id).sort().join(","));
      } else {
        setSavedAttachSig(attachSig);
      }
    });
  }

  function handleSendClick() {
    setSendStatus("idle");
    setSendError("");
    setFollowUpAudienceError("");

    if (!subject.trim() || !body.trim()) {
      setSendStatus("error");
      setSendError(!subject.trim() ? "Subject is required before sending." : "Body is required before sending.");
      return;
    }
    if (previewContacts.length === 0) {
      setSendStatus("error");
      setSendError("Add at least one contact before sending.");
      return;
    }
    if (profileMissing) {
      setSendStatus("error");
      setSendError("Set your sender profile before sending.");
      return;
    }

    if (sendMode === "followup") {
      setShowFollowUpReview(true);
      requestAnimationFrame(() => {
        composerRootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    setShowSendModal(true);
  }

  function handleConfirmSend() {
    setSendError("");

    if (sendMode === "followup") {
      if (followUpAudienceError) {
        setSendError(followUpAudienceError);
        return;
      }
      if (isLoadingFollowUpCount) {
        setSendError("Checking the follow-up audience. Try again in a moment.");
        return;
      }
      if ((followUpCount ?? 0) === 0) {
        setSendError("No contacts match the selected follow-up segment.");
        return;
      }
    }

    startSend(async () => {
      const result = await enqueueCampaignSend(
        campaignId,
        subject,
        body,
        attachments.map((a) => a.id),
        sendMode === "followup"
          ? { mode: "followup", followUpSegment }
          : { mode: "initial" }
      );
      if (result.error) {
        setSendStatus("error");
        setSendError(result.error);
        return;
      }
      setSendStatus("queued");
      if (result.run) {
        setLatestRun(result.run);
      }
      setShowSendModal(false);
      setShowFollowUpReview(false);
    });
  }

  function handleLoadTemplate(template: EmailTemplate, templateAttachments: TemplateAttachment[]) {
    setSubject(template.subject);
    setBody(template.body);
    setAttachments(templateAttachments);
    setLoadedTemplateId(template.id);
    setSavedAttachSig(templateAttachments.map((a) => a.id).sort().join(","));
    setSavedSubject(template.subject);
    setSavedBody(template.body);
    setSaveStatus("idle");
    setSendStatus("idle");
    setSendError("");
    setAttachError("");
    setTab("compose");
    // Brief flash so the user sees the content loaded
    setTimeout(() => bodyRef.current?.focus(), 80);
  }

  async function handleAttachmentFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachError("");
    setIsUploadingAttach(true);
    try {
      let nextAttachments = [...attachments];
      for (const file of Array.from(fileList)) {
        if (nextAttachments.length >= MAX_TEMPLATE_ATTACHMENTS) {
          setAttachError(`You can attach up to ${MAX_TEMPLATE_ATTACHMENTS} files.`);
          break;
        }
        const fd = new FormData();
        fd.append("file", file);
        if (loadedTemplateId) {
          fd.append("templateId", loadedTemplateId);
        } else {
          fd.append(
            "retainedAttachmentIds",
            JSON.stringify(nextAttachments.map((attachment) => attachment.id))
          );
        }
        const { data, error } = await uploadTemplateAttachment(fd);
        if (error) {
          setAttachError(error);
          break;
        }
        if (data) {
          nextAttachments = [...nextAttachments, data];
          setAttachments(nextAttachments);
          setSaveStatus("idle");
          setSendStatus("idle");
        }
      }
    } finally {
      setIsUploadingAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAttachment(id: string) {
    setAttachError("");
    const { error } = await deleteTemplateAttachment(id);
    if (error) {
      setAttachError(error);
      return;
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setSaveStatus("idle");
    setSendStatus("idle");
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleGenerate() {
    resetAiFeedback();
    startGenerate(async () => {
      const sample = previewContacts[0] ?? null;
      try {
        const result = await streamEmailAgentRequest(
          {
            mode: "generate",
            campaignId,
            campaignName,
            campaignDescription,
            contact: {
              firstName: sample?.first_name,
              lastName: sample?.last_name,
              company: sample?.company,
              email: sample?.email,
            },
            sender: {
              name: profile?.full_name,
              company: profile?.company,
            },
            campaignFiles,
          },
          handleAiStreamEvent
        );

        if (!result.subject) {
          throw new Error("Incomplete response from AI.");
        }

        setSubject(result.subject);
        setBody(result.body);
        setAttachments([]);
        setLoadedTemplateId(null);
        setSavedAttachSig("");
        setSaveStatus("idle");
        setSendStatus("idle");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.startsWith("__RATE_LIMIT__:")) {
          setShowUpgradeModal(true);
        } else {
          setAiError(message);
        }
      }
    });
  }

  // ── AI Writer (/ command) ─────────────────────────────────────────────────
  const [showAiWriter,   setShowAiWriter]   = useState(false);
  const [aiWriterPrompt, setAiWriterPrompt] = useState("");
  const [aiWriterMode,   setAiWriterMode]   = useState<"prompt" | "polish">("prompt");
  const [aiWriterError,  setAiWriterError]  = useState("");
  const [isPolishing,    startPolish]       = useTransition();
  const writerRef = useRef<HTMLTextAreaElement>(null);

  function resetAiFeedback() {
    setAiError("");
    setAiStatus("");
    setAiActivity([]);
  }

  function appendAiActivity(line: string) {
    setAiActivity((current) => [...current, line].slice(-4));
  }

  function handleAiStreamEvent(event: EmailAgentStreamEvent) {
    if (event.type === "status") {
      setAiStatus(event.message);
      return;
    }

    if (event.type === "tool-start") {
      appendAiActivity(`${toolLabel(event.tool)} started`);
      return;
    }

    if (event.type === "tool-end") {
      appendAiActivity(`${toolLabel(event.tool)} finished`);
      return;
    }

    if (event.type === "error") {
      if (showAiWriter) {
        setAiWriterError(event.error);
      } else {
        setAiError(event.error);
      }
      return;
    }

    if (event.type === "final") {
      setAiStatus("AI draft ready.");
    }
  }

  // Focus the writer textarea when panel opens
  useEffect(() => {
    if (showAiWriter) {
      setTimeout(() => writerRef.current?.focus(), 60);
    }
  }, [showAiWriter]);

  const openAiWriter = () => {
    resetAiFeedback();
    setAiWriterError("");
    setAiWriterPrompt("");
    setShowAiWriter(true);
  };

  const closeAiWriter = () => {
    setShowAiWriter(false);
    setAiWriterError("");
    // Restore focus to the body textarea
    setTimeout(() => bodyRef.current?.focus(), 60);
  };

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Open AI writer when "/" is typed and the body is empty (or the field is empty)
    if (e.key === "/" && body.trim() === "" && !showAiWriter) {
      e.preventDefault();
      openAiWriter();
    }
    // Also allow Ctrl/Cmd+K as a shortcut regardless of body content
    if ((e.metaKey || e.ctrlKey) && e.key === "k" && !showAiWriter) {
      e.preventDefault();
      openAiWriter();
    }
  }

  function handleAiWriterKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") closeAiWriter();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handlePolish();
  }

  function handlePolish() {
    setAiWriterError("");
    resetAiFeedback();
    startPolish(async () => {
      try {
        const result = await streamEmailAgentRequest(
          {
            mode: "writer",
            writerMode: aiWriterMode,
            campaignId,
            campaignName,
            campaignDescription,
            userInput: aiWriterPrompt,
            sender: {
              name: profile?.full_name,
              company: profile?.company,
            },
            contact: previewContact
              ? {
                  firstName: previewContact.first_name,
                  lastName: previewContact.last_name,
                  company: previewContact.company,
                  email: previewContact.email,
                }
              : undefined,
            campaignFiles,
          },
          handleAiStreamEvent
        );

        setBody(result.body);
        if (result.subject) setSubject(result.subject);
        setSaveStatus("idle");
        closeAiWriter();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.startsWith("__RATE_LIMIT__:")) {
          closeAiWriter();
          setShowUpgradeModal(true);
        } else {
          setAiWriterError(message);
        }
      }
    });
  }

  return (
    <div ref={composerRootRef} className="space-y-4">

      {/* ── AI Upgrade modal ─────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}
        >
          <div
            className="rk-fade-up w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #1a1610 0%, #141210 100%)",
              border: "1px solid rgba(43,122,95,0.3)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            }}
          >
            {/* Gold top bar */}
            <div className="h-[3px]" style={{ background: "linear-gradient(90deg, var(--wm-accent) 0%, rgba(43,122,95,0.3) 100%)" }} />

            <div className="p-6 flex flex-col gap-5">
              {/* Icon + heading */}
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(43,122,95,0.12)", border: "1px solid rgba(43,122,95,0.25)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--wm-text)", fontFamily: "var(--font-display)" }}>
                    AI generation limit reached
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--wm-text-sub)" }}>
                    You&apos;ve used all 15 free AI generations. Upgrade to a paid plan for unlimited AI drafting and personalization.
                  </p>
                </div>
              </div>

              {/* Feature bullets */}
              <ul className="space-y-2">
                {[
                  "Unlimited AI email generation",
                  "AI Writer with prompt & polish modes",
                  "Smart follow-up sequences",
                  "10,000+ emails per month",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-xs" style={{ color: "var(--wm-text-muted)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-sm font-semibold py-2.5 rounded-xl"
                  style={{
                    background: "var(--wm-accent)",
                    color: "var(--wm-accent-text)",
                    textDecoration: "none",
                  }}
                >
                  View plans →
                </a>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 text-sm py-2.5 rounded-xl"
                  style={{
                    background: "var(--wm-border)",
                    border: "1px solid var(--wm-border-md)",
                    color: "var(--wm-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Save-as modal ────────────────────────────────────────────────── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
        >
          <div
            className="rk-fade-up w-full max-w-sm mx-4 rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "var(--wm-surface, #141417)",
              border: "1px solid rgba(43,122,95,0.25)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: "var(--wm-text)", fontFamily: "var(--font-display, serif)" }}>
                Save as template
              </span>
            </div>

            {/* Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest" style={{ color: "var(--wm-text-sub)" }}>
                Template name
              </label>
              <input
                ref={templateNameRef}
                type="text"
                aria-label="Template name"
                value={templateName}
                onChange={(e) => { setTemplateName(e.target.value); setSaveModalError(""); }}
                onKeyDown={handleSaveModalKeyDown}
                placeholder="e.g. Cold outreach intro, Follow-up v2…"
                maxLength={80}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--wm-surface-2, #1a1a1f)",
                  border: saveModalError ? "1px solid rgba(239,68,68,0.5)" : "1px solid var(--wm-border-md, var(--wm-border-md))",
                  color: "var(--wm-text)",
                  caretColor: "var(--wm-accent)",
                }}
              />
              {saveModalError && (
                <p className="text-[11px]" style={{ color: "#f87171" }}>{saveModalError}</p>
              )}
            </div>

            {/* Preview of what will be saved */}
            <div
              className="px-3 py-2.5 rounded-xl text-xs space-y-1"
              style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
            >
              <div className="truncate" style={{ color: "var(--wm-text-muted)" }}>
                <span style={{ color: "var(--wm-text-sub)" }}>Subject: </span>{subject || <em style={{ opacity: 0.5 }}>empty</em>}
              </div>
              <div className="line-clamp-2 leading-relaxed" style={{ color: "var(--wm-text-sub)" }}>
                {body.slice(0, 100)}{body.length > 100 ? "…" : ""}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: "transparent", border: "1px solid var(--wm-border)", color: "var(--wm-text-muted)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                aria-label="Confirm save template"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: isSaving ? "rgba(43,122,95,0.4)" : "var(--wm-accent)",
                  color: "var(--wm-accent-text)",
                  border: "none",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? "Saving…" : "Save template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSendModal(false); }}
        >
          <div
            className="rk-fade-up w-full max-w-sm mx-4 rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "var(--wm-surface, #141417)",
              border: "1px solid rgba(43,122,95,0.25)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
            }}
          >
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--wm-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span className="text-sm font-semibold" style={{ color: "var(--wm-text)", fontFamily: "var(--font-display, serif)" }}>
                Queue campaign send
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "initial" as const, label: "Initial send" },
                  { value: "followup" as const, label: "Follow-up" },
                ].map((option) => {
                  const active = sendMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSendMode(option.value);
                        setSendError("");
                      }}
                      className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                      style={{
                        background: active ? "rgba(43,122,95,0.14)" : "var(--wm-surface-2)",
                        border: active
                          ? "1px solid rgba(43,122,95,0.35)"
                          : "1px solid var(--wm-border)",
                        color: active ? "var(--wm-accent)" : "var(--wm-text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {sendMode === "followup" && (
                <div
                  className="space-y-2 rounded-xl px-3 py-3"
                  style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
                >
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-widest" style={{ color: "var(--wm-text-sub)" }}>
                      Follow-up audience
                    </label>
                    <select
                      value={followUpSegment}
                      onChange={(e) => {
                        setFollowUpSegment(e.target.value as FollowUpSegment);
                        setSendError("");
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{
                        background: "var(--wm-surface)",
                        border: "1px solid var(--wm-border)",
                        color: "var(--wm-text)",
                      }}
                    >
                      {FOLLOW_UP_SEGMENTS.map((segment) => (
                        <option key={segment.value} value={segment.value}>
                          {followUpSegmentLabel(segment.value)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--wm-text-sub)" }}>
                    {FOLLOW_UP_SEGMENTS.find((segment) => segment.value === followUpSegment)?.description}
                  </p>

                  <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "var(--wm-text-muted)" }}>
                    <span>
                      {isLoadingFollowUpCount
                        ? "Checking matching contacts..."
                        : `${followUpCount ?? 0} matching contact${followUpCount === 1 ? "" : "s"}`}
                    </span>
                    <span style={{ color: "var(--wm-text-sub)" }}>
                      based on each contact&apos;s latest campaign send
                    </span>
                  </div>

                  {followUpAudienceError && (
                    <div
                      className="px-3 py-2 rounded-lg text-xs"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                    >
                      {followUpAudienceError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs" style={{ color: "var(--wm-text-muted)" }}>
              {sendMode === "followup" ? (
                <>
                  This follow-up will queue for <strong style={{ color: "var(--wm-text)" }}>{followUpCount ?? 0}</strong> contact{followUpCount === 1 ? "" : "s"} in <strong style={{ color: "var(--wm-text)" }}>{followUpSegmentLabel(followUpSegment)}</strong>.
                </>
              ) : (
                <>
                  This will send to <strong style={{ color: "var(--wm-text)" }}>{previewContacts.length}</strong> contact{previewContacts.length === 1 ? "" : "s"} in this campaign.
                </>
              )}
              {attachments.length > 0 && (
                <span>
                  {" "}
                  with <strong style={{ color: "var(--wm-text)" }}>{attachments.length}</strong> attachment{attachments.length === 1 ? "" : "s"}.
                </span>
              )}
            </div>

            <div
              className="px-3 py-2.5 rounded-xl text-xs space-y-1"
              style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
            >
              <div className="truncate" style={{ color: "var(--wm-text-muted)" }}>
                <span style={{ color: "var(--wm-text-sub)" }}>Subject: </span>{subject || <em style={{ opacity: 0.5 }}>empty</em>}
              </div>
              <div className="line-clamp-2 leading-relaxed" style={{ color: "var(--wm-text-sub)" }}>
                {body.slice(0, 100)}{body.length > 100 ? "…" : ""}
              </div>
            </div>

            {sendError && (
              <div
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
              >
                {sendError}
              </div>
            )}

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: "transparent", border: "1px solid var(--wm-border)", color: "var(--wm-text-muted)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                aria-label="Confirm send now"
                disabled={isSending || (sendMode === "followup" && isLoadingFollowUpCount)}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: isSending ? "rgba(43,122,95,0.4)" : "var(--wm-accent)",
                  color: "var(--wm-accent-text)",
                  border: "none",
                  cursor: isSending || (sendMode === "followup" && isLoadingFollowUpCount) ? "not-allowed" : "pointer",
                  opacity: isSending || (sendMode === "followup" && isLoadingFollowUpCount) ? 0.7 : 1,
                }}
              >
                {isSending
                  ? "Queueing..."
                  : sendMode === "followup"
                    ? "Queue follow-up"
                    : "Queue send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sender context bar ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl flex-wrap"
        style={{
          background: profileMissing ? "rgba(43,122,95,0.05)" : "var(--wm-surface)",
          border: profileMissing ? "1px solid rgba(43,122,95,0.25)" : "1px solid var(--wm-border)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold uppercase"
            style={{
              background: senderName ? "var(--wm-accent-dim)" : "var(--wm-surface-2)",
              border: senderName ? "1px solid rgba(43,122,95,0.3)" : "1px solid var(--wm-border)",
              color: senderName ? "var(--wm-accent)" : "var(--wm-text-sub)",
            }}
          >
            {senderName ? senderName[0] : "?"}
          </div>
          <div className="min-w-0">
            {senderName ? (
              <>
                <div className="text-xs font-medium truncate" style={{ color: "var(--wm-text)" }}>
                  {senderName}
                  {senderCompany && (
                    <span style={{ color: "var(--wm-text-sub)" }}> · {senderCompany}</span>
                  )}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--wm-text-sub)" }}>
                  Sending as —{" "}
                  <code style={{ fontFamily: "monospace", color: "var(--wm-accent)" }}>{"{{sender_name}}"}</code>
                  {" "}resolves here
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: "var(--wm-accent)" }}>
                Set your sender profile so emails know who they&apos;re from
              </div>
            )}
          </div>
        </div>

        {/* Edit trigger */}
        <SenderProfileSheet
          profile={profile}
          onSaved={setProfile}
          trigger={
            <button
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: profileMissing ? "rgba(43,122,95,0.1)" : "transparent",
                border: profileMissing ? "1px solid rgba(43,122,95,0.3)" : "1px solid var(--wm-border)",
                color: profileMissing ? "var(--wm-accent)" : "var(--wm-text-muted)",
                cursor: "pointer",
                fontWeight: profileMissing ? 500 : 400,
              }}
            >
              {profileMissing ? "Set up →" : "Edit"}
            </button>
          }
        />
      </div>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tab switcher */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--wm-border)", background: "var(--wm-surface)" }}
        >
          {(["compose", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 text-xs capitalize transition-colors"
              style={{
                background:  tab === t ? "rgba(43,122,95,0.12)" : "transparent",
                color:       tab === t ? "var(--wm-accent)"        : "var(--wm-text-muted)",
                fontWeight:  tab === t ? 600 : 400,
                border:      "none",
                cursor:      "pointer",
                borderRight: t === "compose" ? "1px solid var(--wm-border)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Template Library */}
          <TemplateLibrary
            onLoad={handleLoadTemplate}
          />

          {/* AI Generate */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: isGenerating ? "rgba(43,122,95,0.06)" : "rgba(43,122,95,0.1)",
              border: "1px solid rgba(43,122,95,0.3)",
              color: "var(--wm-accent)",
              cursor: isGenerating ? "not-allowed" : "pointer",
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <SpinnerIcon />
                Generating…
              </>
            ) : (
              <>
                <SparkleIcon />
                Generate with AI
              </>
            )}
          </button>

          {/* Send Now */}
          <button
            onClick={handleSendClick}
            disabled={isSending || isGenerating}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(212, 168, 83, 0.1)",
              border: "1px solid rgba(212, 168, 83, 0.3)",
              color: "var(--wm-accent)",
              cursor: isSending ? "not-allowed" : "pointer",
              opacity: isSending ? 0.6 : 1,
            }}
          >
            {isSending ? "Queueing..." : "Queue send"}
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving || isGenerating || !isDirty}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "var(--wm-surface)",
              border: "1px solid var(--wm-border)",
              color: isDirty ? "var(--wm-text-muted)" : "var(--wm-text-sub)",
              cursor: (!isDirty || isSaving) ? "not-allowed" : "pointer",
              opacity: (!isDirty || isSaving) ? 0.5 : 1,
            }}
          >
            {isSaving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      {sendMode === "followup" && (
        <div
          className="rk-fade-in flex items-start justify-between gap-3 rounded-2xl px-4 py-3 flex-wrap"
          style={{
            background: "linear-gradient(135deg, rgba(43,122,95,0.12), rgba(212,168,83,0.08))",
            border: "1px solid rgba(43,122,95,0.22)",
          }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: "var(--wm-accent)" }}>
              Follow-Up Armed
            </div>
            <div className="text-sm font-medium" style={{ color: "var(--wm-text)" }}>
              {followUpSegmentLabel(followUpSegment)}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--wm-text-muted)" }}>
              {isLoadingFollowUpCount
                ? "Checking who matches this audience..."
                : `${followUpCount ?? 0} matching contact${followUpCount === 1 ? "" : "s"} based on each contact's latest campaign send.`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFollowUpReview((current) => !current)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "var(--wm-accent)",
                border: "1px solid transparent",
                color: "var(--wm-accent-text)",
                cursor: "pointer",
              }}
            >
              {showFollowUpReview ? "Hide audience" : "Review audience"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSendMode("initial");
                setShowFollowUpReview(false);
                setFollowUpAudienceError("");
                setSendError("");
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: "transparent",
                border: "1px solid var(--wm-border)",
                color: "var(--wm-text-muted)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {sendMode === "followup" && showFollowUpReview && (
        <div
          className="rk-fade-in rounded-2xl p-4 space-y-4"
          style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: "var(--wm-accent)" }}>
                Review Audience
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--wm-text)" }}>
                {followUpSegmentLabel(followUpSegment)}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--wm-text-muted)" }}>
                {isLoadingFollowUpPreview
                  ? "Loading matching contacts..."
                  : `${followUpPreview.length} contact${followUpPreview.length === 1 ? "" : "s"} will receive this follow-up.`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFollowUpReview(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid var(--wm-border)",
                  color: "var(--wm-text-muted)",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending || isLoadingFollowUpCount || isLoadingFollowUpPreview}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: isSending ? "rgba(43,122,95,0.4)" : "var(--wm-accent)",
                  color: "var(--wm-accent-text)",
                  border: "1px solid transparent",
                  cursor: isSending || isLoadingFollowUpCount || isLoadingFollowUpPreview ? "not-allowed" : "pointer",
                  opacity: isSending || isLoadingFollowUpCount || isLoadingFollowUpPreview ? 0.7 : 1,
                }}
              >
                {isSending ? "Queueing..." : "Queue follow-up"}
              </button>
            </div>
          </div>

          <div
            className="px-3 py-2.5 rounded-xl text-xs space-y-1"
            style={{ background: "var(--wm-surface-2)", border: "1px solid var(--wm-border)" }}
          >
            <div className="truncate" style={{ color: "var(--wm-text-muted)" }}>
              <span style={{ color: "var(--wm-text-sub)" }}>Subject: </span>{subject || <em style={{ opacity: 0.5 }}>empty</em>}
            </div>
            <div className="line-clamp-2 leading-relaxed" style={{ color: "var(--wm-text-sub)" }}>
              {body.slice(0, 140)}{body.length > 140 ? "…" : ""}
            </div>
          </div>

          <div
            className="max-h-72 overflow-y-auto rounded-xl"
            style={{ border: "1px solid var(--wm-border)", background: "var(--wm-surface-2)" }}
          >
            {isLoadingFollowUpPreview ? (
              <div className="px-4 py-6 text-sm text-center" style={{ color: "var(--wm-text-sub)" }}>
                Loading audience preview…
              </div>
            ) : followUpPreview.length === 0 ? (
              <div className="px-4 py-6 text-sm text-center" style={{ color: "var(--wm-text-sub)" }}>
                No contacts match this follow-up audience.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--wm-border)" }}>
                {followUpPreview.map((contact) => {
                  const statusStyle = FOLLOW_UP_STATUS_STYLES[contact.latest_status];
                  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();

                  return (
                    <div key={contact.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--wm-text)" }}>
                          {fullName || contact.email}
                        </div>
                        <div className="text-xs truncate" style={{ color: "var(--wm-text-sub)" }}>
                          {contact.email}
                          {contact.company ? ` · ${contact.company}` : ""}
                        </div>
                      </div>
                      <span
                        className="shrink-0 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {contact.latest_status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {aiError && (
        <div
          className="rk-fade-in px-4 py-3 rounded-lg text-xs"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {aiError}
        </div>
      )}

      {(aiStatus || aiActivity.length > 0) && (
        <div
          className="rk-fade-in px-4 py-3 rounded-lg text-xs space-y-1.5"
          style={{ background: "rgba(43,122,95,0.06)", border: "1px solid rgba(43,122,95,0.18)", color: "var(--wm-text-muted)" }}
        >
          {aiStatus && <div style={{ color: "var(--wm-accent)" }}>{aiStatus}</div>}
          {aiActivity.map((entry) => (
            <div key={entry}>{entry}</div>
          ))}
        </div>
      )}

      {/* ── Save feedback ────────────────────────────────────────────────── */}
      {saveStatus === "saved" && (
        <div
          className="rk-fade-in px-4 py-2.5 rounded-lg text-xs flex items-center gap-2"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--wm-accent)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Template saved
        </div>
      )}
      {saveStatus === "error" && (
        <div
          className="rk-fade-in px-4 py-2.5 rounded-lg text-xs"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {saveError}
        </div>
      )}

      {sendStatus === "queued" && (
        <div
          className="rk-fade-in px-4 py-2.5 rounded-lg text-xs flex items-center gap-2"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--wm-accent)" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Campaign send queued. You can keep editing while delivery runs in the background.
        </div>
      )}
      {sendStatus === "error" && sendError && (
        <div
          className="rk-fade-in px-4 py-2.5 rounded-lg text-xs"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {sendError}
        </div>
      )}

      {/* ── COMPOSE tab ─────────────────────────────────────────────────── */}
      {tab === "compose" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
          {/* Subject */}
          <div style={{ borderBottom: "1px solid var(--wm-border)" }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-[10px] uppercase tracking-widest shrink-0 w-12" style={{ color: "var(--wm-text-sub)" }}>
                Subject
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setSaveStatus("idle"); setSendStatus("idle"); }}
                placeholder="Your subject line…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--wm-text)", caretColor: "var(--wm-accent)" }}
                aria-label="Email subject"
              />
              <span
                className="text-[10px] shrink-0"
                style={{ color: subject.length > 60 ? "#f87171" : "var(--wm-text-sub)" }}
              >
                {subject.length}/60
              </span>
            </div>
          </div>

          {/* Attachments (stored with templates; included when sending) */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--wm-border)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest shrink-0" style={{ color: "var(--wm-text-sub)" }}>
                Attachments
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => { void handleAttachmentFiles(e.target.files); }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttach || attachments.length >= MAX_TEMPLATE_ATTACHMENTS}
                className="text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                style={{
                  background: "var(--wm-surface-2)",
                  border: "1px solid var(--wm-border)",
                  color: "var(--wm-text-muted)",
                  cursor: isUploadingAttach || attachments.length >= MAX_TEMPLATE_ATTACHMENTS ? "not-allowed" : "pointer",
                  opacity: attachments.length >= MAX_TEMPLATE_ATTACHMENTS ? 0.5 : 1,
                }}
              >
                {isUploadingAttach ? "Uploading..." : "Add files"}
              </button>
              <span className="text-[10px]" style={{ color: "var(--wm-text-sub)" }}>
                {attachments.length}/{MAX_TEMPLATE_ATTACHMENTS} · max 10 MB each
              </span>
            </div>
            {attachError && (
              <p className="text-[11px] mb-2" style={{ color: "#f87171" }}>{attachError}</p>
            )}
            {attachments.length > 0 && (
              <ul className="space-y-1.5">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 text-xs rounded-lg px-2.5 py-1.5"
                    style={{ background: "var(--wm-bg)", border: "1px solid var(--wm-border)" }}
                  >
                    <span className="truncate font-medium" style={{ color: "var(--wm-text-muted)" }} title={a.file_name}>
                      {a.file_name}
                    </span>
                    <span className="shrink-0 text-[10px]" style={{ color: "var(--wm-text-sub)" }}>
                      {formatFileSize(a.file_size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => { void handleRemoveAttachment(a.id); }}
                      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Body */}
          <div className="relative">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => { setBody(e.target.value); setSaveStatus("idle"); setSendStatus("idle"); }}
              onKeyDown={handleBodyKeyDown}
              placeholder={"Write your email body here, or press / to write with AI…"}
              rows={14}
              className="w-full bg-transparent text-sm outline-none resize-none px-4 py-4 leading-relaxed"
              style={{ color: "var(--wm-text)", caretColor: "var(--wm-accent)" }}
              aria-label="Email body"
            />

            {/* ── AI Writer Panel ────────────────────────────────────────── */}
            {showAiWriter && (
              <div
                className="rk-fade-up absolute inset-x-0 bottom-0 z-10 rounded-b-xl overflow-hidden"
                style={{
                  background: "var(--wm-surface-2, #1a1a1f)",
                  borderTop: "1px solid rgba(43,122,95,0.25)",
                  boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center justify-between px-4 pt-3 pb-2"
                  style={{ borderBottom: "1px solid rgba(43,122,95,0.12)" }}
                >
                  <div className="flex items-center gap-2">
                    <SparkleIcon />
                    <span className="text-xs font-semibold" style={{ color: "var(--wm-accent)", fontFamily: "var(--font-display, serif)" }}>
                      Write with AI
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mode toggle */}
                    <div
                      className="flex rounded-md overflow-hidden"
                      style={{ border: "1px solid rgba(43,122,95,0.2)", background: "rgba(0,0,0,0.2)" }}
                    >
                      {(["prompt", "polish"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setAiWriterMode(m)}
                          className="px-3 py-1 text-[11px] capitalize transition-colors"
                          style={{
                            background:  aiWriterMode === m ? "rgba(43,122,95,0.15)" : "transparent",
                            color:       aiWriterMode === m ? "var(--wm-accent)"        : "var(--wm-text-sub)",
                            fontWeight:  aiWriterMode === m ? 600                     : 400,
                            border:      "none",
                            cursor:      "pointer",
                            borderRight: m === "prompt" ? "1px solid rgba(43,122,95,0.2)" : "none",
                          }}
                        >
                          {m === "prompt" ? "From prompt" : "Polish draft"}
                        </button>
                      ))}
                    </div>
                    {/* Close */}
                    <button
                      onClick={closeAiWriter}
                      aria-label="Close AI writer"
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                      style={{
                        background: "transparent",
                        border: "1px solid var(--wm-border)",
                        color: "var(--wm-text-sub)",
                        cursor: "pointer",
                        fontSize: "14px",
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Prompt / draft input */}
                <div className="px-4 pt-3 pb-2">
                  <textarea
                    ref={writerRef}
                    value={aiWriterPrompt}
                    onChange={(e) => setAiWriterPrompt(e.target.value)}
                    onKeyDown={handleAiWriterKeyDown}
                    placeholder={
                      aiWriterMode === "prompt"
                        ? `Describe the email you want... e.g. "cold outreach for our Q3 SaaS launch, keep it under 100 words"`
                        : "Paste your rough draft here — AI will polish the tone, clarity, and punch…"
                    }
                    rows={4}
                    className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed"
                    style={{
                      color: "var(--wm-text-muted)",
                      caretColor: "var(--wm-accent)",
                    }}
                    aria-label="AI writer prompt"
                  />
                </div>

                {/* Error */}
                {aiWriterError && (
                  <div
                    className="rk-fade-in mx-4 mb-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                  >
                    {aiWriterError}
                  </div>
                )}

                {(aiStatus || aiActivity.length > 0) && (
                  <div
                    className="mx-4 mb-2 px-3 py-2 rounded-lg text-[11px] space-y-1"
                    style={{ background: "rgba(43,122,95,0.06)", border: "1px solid rgba(43,122,95,0.18)", color: "var(--wm-text-muted)" }}
                  >
                    {aiStatus && <div style={{ color: "var(--wm-accent)" }}>{aiStatus}</div>}
                    {aiActivity.map((entry) => (
                      <div key={entry}>{entry}</div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderTop: "1px solid rgba(43,122,95,0.1)" }}
                >
                  <span className="text-[10px]" style={{ color: "var(--wm-text-sub)" }}>
                    ⌘↵ to generate · Esc to dismiss
                  </span>
                  <button
                    onClick={handlePolish}
                    disabled={isPolishing || !aiWriterPrompt.trim()}
                    aria-label={aiWriterMode === "prompt" ? "AI writer generate" : "AI writer polish"}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: isPolishing || !aiWriterPrompt.trim()
                        ? "rgba(43,122,95,0.06)"
                        : "rgba(43,122,95,0.15)",
                      border: "1px solid rgba(43,122,95,0.35)",
                      color: isPolishing || !aiWriterPrompt.trim()
                        ? "var(--wm-text-sub)"
                        : "var(--wm-accent)",
                      cursor: isPolishing || !aiWriterPrompt.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {isPolishing ? (
                      <>
                        <SpinnerIcon />
                        {aiWriterMode === "prompt" ? "Generating…" : "Polishing…"}
                      </>
                    ) : (
                      <>
                        <SparkleIcon />
                        {aiWriterMode === "prompt" ? "Generate" : "Polish"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Slash-command hint when body is empty and panel is closed */}
            {!showAiWriter && !body && (
              <button
                onClick={openAiWriter}
                className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[10px] transition-opacity opacity-40 hover:opacity-80"
                style={{ color: "var(--wm-text-sub)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                tabIndex={-1}
                aria-hidden="true"
              >
                <SparkleIcon />
                press / or ⌘K to write with AI
              </button>
            )}
          </div>

          {/* Variable chips */}
          <div
            className="px-4 py-3 space-y-2"
            style={{ borderTop: "1px solid var(--wm-border)" }}
          >
            {/* Recipient tokens */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest w-16 shrink-0" style={{ color: "var(--wm-text-sub)" }}>
                Recipient
              </span>
              {CONTACT_VARIABLES.map((v) => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="text-[11px] px-2 py-0.5 rounded-md font-mono transition-colors"
                  style={{
                    background: "rgba(43,122,95,0.08)",
                    border: "1px solid rgba(43,122,95,0.2)",
                    color: "var(--wm-accent)",
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Sender tokens — auto-resolved from profile */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest w-16 shrink-0" style={{ color: "var(--wm-text-sub)" }}>
                Sender
              </span>
              {SENDER_VARIABLES.map((v) => {
                const resolved = v === "{{sender_name}}" ? senderName : senderCompany;
                return (
                  <div key={v} className="flex items-center gap-1.5">
                    <button
                      onClick={() => insertVariable(v)}
                      className="text-[11px] px-2 py-0.5 rounded-md font-mono transition-colors"
                      style={{
                        background: resolved ? "rgba(43,122,95,0.08)" : "var(--wm-surface-2)",
                        border: resolved ? "1px solid rgba(43,122,95,0.2)" : "1px solid var(--wm-border)",
                        color: resolved ? "var(--wm-accent)" : "var(--wm-text-sub)",
                        cursor: "pointer",
                      }}
                    >
                      {v}
                    </button>
                    {resolved && (
                      <span className="text-[10px]" style={{ color: "var(--wm-text-sub)" }}>
                        → {resolved}
                      </span>
                    )}
                  </div>
                );
              })}
              {profileMissing && (
                <SenderProfileSheet
                  profile={profile}
                  onSaved={setProfile}
                  trigger={
                    <button
                      className="text-[10px] px-2 py-0.5 rounded-md transition-colors"
                      style={{
                        background: "rgba(43,122,95,0.06)",
                        border: "1px dashed rgba(43,122,95,0.3)",
                        color: "var(--wm-accent)",
                        cursor: "pointer",
                      }}
                    >
                      Set up →
                    </button>
                  }
                />
              )}
            </div>
          </div>
          </div>
          <div
            className="rounded-xl p-3 lg:sticky lg:top-4"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            <SendRunStatus campaignId={campaignId} initialRun={latestRun} />
          </div>
        </div>
      )}

      {/* ── PREVIEW tab ─────────────────────────────────────────────────── */}
      {tab === "preview" && (
        <div className="space-y-3">
          {/* Contact picker */}
          {previewContacts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: "var(--wm-text-sub)" }}>Preview as:</span>
              <div className="flex gap-1.5 flex-wrap">
                {previewContacts.slice(0, 5).map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setPreviewIdx(i)}
                    className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      background:  previewIdx === i ? "rgba(43,122,95,0.12)" : "var(--wm-surface)",
                      border:      previewIdx === i ? "1px solid rgba(43,122,95,0.35)" : "1px solid var(--wm-border)",
                      color:       previewIdx === i ? "var(--wm-accent)" : "var(--wm-text-muted)",
                      cursor:      "pointer",
                      fontWeight:  previewIdx === i ? 600 : 400,
                    }}
                  >
                    {c.first_name ?? c.email.split("@")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rendered preview */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
          >
            {/* Subject preview */}
            <div
              className="px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--wm-border)" }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--wm-text-sub)" }}>Subject</div>
              <div className="text-sm font-medium" style={{ color: "var(--wm-text)" }}>
                {subject ? applyPreview(subject, previewContact, profile) : (
                  <span style={{ color: "var(--wm-text-sub)", fontStyle: "italic" }}>No subject yet</span>
                )}
              </div>
            </div>

            {/* Body preview */}
            <div className="px-5 py-5">
              {body ? (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--wm-text-muted)" }}
                >
                  {applyPreview(body, previewContact, profile)}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--wm-text-sub)", fontStyle: "italic" }}>
                    No body yet — write something in the Compose tab
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Variable legend */}
          {(previewContact || profile) && (
            <div
              className="rounded-lg px-4 py-3"
              style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--wm-text-sub)" }}>
                Variable values
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  ["{{first_name}}",     previewContact?.first_name ?? "—"],
                  ["{{last_name}}",      previewContact?.last_name  ?? "—"],
                  ["{{company}}",        previewContact?.company    ?? "—"],
                  ["{{sender_name}}",    profile?.full_name         || "not set"],
                  ["{{sender_company}}", profile?.company           || "not set"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-[11px]">
                    <code style={{ color: "var(--wm-accent)", fontFamily: "monospace" }}>{k}</code>
                    <span style={{ color: "var(--wm-text-sub)" }}>→</span>
                    <span style={{ color: (v === "not set") ? "#f87171" : "var(--wm-text-muted)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewContacts.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: "var(--wm-text-sub)" }}>
              Add contacts to this campaign to preview personalised output
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path d="M5 3 L5.75 5.25 L8 6 L5.75 6.75 L5 9 L4.25 6.75 L2 6 L4.25 5.25 Z" />
      <path d="M19 15 L19.75 17.25 L22 18 L19.75 18.75 L19 21 L18.25 18.75 L16 18 L18.25 17.25 Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
