"use client";

import { useState } from "react";
import EmailComposer from "@/components/campaigns/email-composer";
import ContactsTable from "@/components/campaigns/contacts-table";
import AddContactForm from "@/components/campaigns/add-contact-form";
import CsvImportButton from "@/components/campaigns/csv-import-button";
import SmartImportButton from "@/components/campaigns/smart-import-button";
import CampaignFileList from "@/components/campaigns/campaign-file-list";
import FollowUpPanel from "@/components/campaigns/follow-up-panel";
import type { FollowUpSegment } from "@/lib/campaign-send/follow-up";
import type { EmailTemplate } from "@/lib/supabase/email-templates";
import type { EmailAgentCampaignFileContext } from "@/lib/ai/email-agent.types";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";
import type { CampaignFile } from "@/lib/supabase/campaign-files";
import type {
  CampaignSendRun,
  FollowUpAudienceSummary,
} from "@/lib/campaign-send/service";

type Tab = "email" | "contacts" | "files";

type FollowUpIntent = {
  segment: FollowUpSegment;
  nonce: number;
};

interface CampaignTabsProps {
  campaignId: string;
  campaignName: string;
  campaignDescription?: string | null;
  initialTemplate: EmailTemplate | null;
  contacts: Contact[];
  initialProfile: UserProfile | null;
  files: CampaignFile[];
  initialLatestRun: CampaignSendRun | null;
  initialFollowUpAudienceSummary: FollowUpAudienceSummary;
}

export default function CampaignTabs({
  campaignId,
  campaignName,
  campaignDescription,
  initialTemplate,
  contacts,
  initialProfile,
  files,
  initialLatestRun,
  initialFollowUpAudienceSummary,
}: CampaignTabsProps) {
  const [tab, setTab] = useState<Tab>("email");
  const [followUpIntent, setFollowUpIntent] = useState<FollowUpIntent | null>(null);
  const emailAgentFiles: EmailAgentCampaignFileContext[] = files.map((file) => ({
    id: file.id,
    fileName: file.file_name,
    storagePath: file.storage_path,
    contentType: file.content_type,
  }));

  return (
    <div className="rk-fade-up rk-delay-2">
      <FollowUpPanel
        campaignId={campaignId}
        initialSummary={initialFollowUpAudienceSummary}
        selectedSegment={followUpIntent?.segment ?? null}
        onPrepareSegment={(segment) => {
          setFollowUpIntent({ segment, nonce: Date.now() });
          setTab("email");
        }}
      />

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-1 mb-6 p-1 rounded-xl w-full sm:w-fit"
        style={{ background: "var(--wm-surface)", border: "1px solid var(--wm-border)" }}
      >
        {/* Email Template tab */}
        <button
          onClick={() => setTab("email")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={
            tab === "email"
              ? {
                  background: "rgba(43,122,95,0.12)",
                  color: "var(--wm-accent)",
                  border: "1px solid rgba(43,122,95,0.25)",
                  boxShadow: "0 1px 3px rgba(43,122,95,0.08)",
                }
              : {
                  background: "transparent",
                  color: "var(--wm-text-muted)",
                  border: "1px solid transparent",
                }
          }
        >
          <SparkleIcon active={tab === "email"} />
          Email Template
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-0.5"
            style={{
              background: tab === "email" ? "rgba(43,122,95,0.15)" : "var(--wm-surface-2)",
              color: tab === "email" ? "var(--wm-accent)" : "var(--wm-text-sub)",
              border: tab === "email" ? "1px solid rgba(43,122,95,0.2)" : "1px solid var(--wm-border)",
            }}
          >
            AI
          </span>
        </button>

        {/* Contacts tab */}
        <button
          onClick={() => setTab("contacts")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={
            tab === "contacts"
              ? {
                  background: "rgba(43,122,95,0.12)",
                  color: "var(--wm-accent)",
                  border: "1px solid rgba(43,122,95,0.25)",
                }
              : {
                  background: "transparent",
                  color: "var(--wm-text-muted)",
                  border: "1px solid transparent",
                }
          }
        >
          <ContactsIcon active={tab === "contacts"} />
          Contacts
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-0.5 tabular-nums"
            style={{
              background: tab === "contacts" ? "rgba(43,122,95,0.15)" : "var(--wm-surface-2)",
              color: tab === "contacts" ? "var(--wm-accent)" : "var(--wm-text-sub)",
              border: tab === "contacts" ? "1px solid rgba(43,122,95,0.2)" : "1px solid var(--wm-border)",
            }}
          >
            {contacts.length}
          </span>
        </button>

        {/* Files tab */}
        <button
          onClick={() => setTab("files")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={
            tab === "files"
              ? {
                  background: "rgba(43,122,95,0.12)",
                  color: "var(--wm-accent)",
                  border: "1px solid rgba(43,122,95,0.25)",
                }
              : {
                  background: "transparent",
                  color: "var(--wm-text-muted)",
                  border: "1px solid transparent",
                }
          }
        >
          <FilesIcon active={tab === "files"} />
          Files
          {files.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-0.5 tabular-nums"
              style={{
                background: tab === "files" ? "rgba(43,122,95,0.15)" : "var(--wm-surface-2)",
                color: tab === "files" ? "var(--wm-accent)" : "var(--wm-text-sub)",
                border: tab === "files" ? "1px solid rgba(43,122,95,0.2)" : "1px solid var(--wm-border)",
              }}
            >
              {files.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Email Template panel ─────────────────────────────────────────── */}
      {tab === "email" && (
        <EmailComposer
          campaignId={campaignId}
          campaignName={campaignName}
          campaignDescription={campaignDescription}
          initialTemplate={initialTemplate}
          previewContacts={contacts}
          initialProfile={initialProfile}
          campaignFiles={emailAgentFiles}
          initialLatestRun={initialLatestRun}
          followUpIntent={followUpIntent}
          initialFollowUpAudienceSummary={initialFollowUpAudienceSummary}
        />
      )}

      {/* ── Contacts panel ───────────────────────────────────────────────── */}
      {tab === "contacts" && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Contacts table */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
              >
                Contacts
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--wm-accent-dim)",
                  color: "var(--wm-accent)",
                  border: "1px solid rgba(43,122,95,0.2)",
                }}
              >
                {contacts.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <CsvImportButton campaignId={campaignId} />
                <SmartImportButton campaignId={campaignId} />
              </div>
            </div>
            <ContactsTable contacts={contacts} campaignId={campaignId} />
          </div>

          {/* Add contact form */}
          <div className="lg:col-span-2">
            <h2
              className="text-sm font-semibold mb-3"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              Add Contact
            </h2>
            <AddContactForm campaignId={campaignId} />
          </div>
        </div>
      )}

      {/* ── Files panel ──────────────────────────────────────────────────── */}
      {tab === "files" && (
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--wm-text)" }}
            >
              Uploaded Files
            </h2>
            {files.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--wm-accent-dim)",
                  color: "var(--wm-accent)",
                  border: "1px solid rgba(43,122,95,0.2)",
                }}
              >
                {files.length}
              </span>
            )}
          </div>
          <CampaignFileList files={files} campaignId={campaignId} />
        </div>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function SparkleIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: active ? "var(--wm-accent)" : "var(--wm-text-muted)" }}
    >
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" />
      <path d="M5 3 L5.75 5.25 L8 6 L5.75 6.75 L5 9 L4.25 6.75 L2 6 L4.25 5.25 Z" />
      <path d="M19 15 L19.75 17.25 L22 18 L19.75 18.75 L19 21 L18.25 18.75 L16 18 L18.25 17.25 Z" />
    </svg>
  );
}

function ContactsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: active ? "var(--wm-accent)" : "var(--wm-text-muted)" }}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FilesIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: active ? "var(--wm-accent)" : "var(--wm-text-muted)" }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
