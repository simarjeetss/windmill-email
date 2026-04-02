"use client";

import { useState } from "react";
import EmailComposer from "@/components/campaigns/email-composer";
import ContactsTable from "@/components/campaigns/contacts-table";
import AddContactForm from "@/components/campaigns/add-contact-form";
import CsvImportButton from "@/components/campaigns/csv-import-button";
import type { EmailTemplate } from "@/lib/supabase/email-templates";
import type { Contact } from "@/lib/supabase/campaigns";
import type { UserProfile } from "@/lib/supabase/profile";

type Tab = "email" | "contacts";

interface CampaignTabsProps {
  campaignId: string;
  campaignName: string;
  campaignDescription?: string | null;
  initialTemplate: EmailTemplate | null;
  contacts: Contact[];
  initialProfile: UserProfile | null;
}

export default function CampaignTabs({
  campaignId,
  campaignName,
  campaignDescription,
  initialTemplate,
  contacts,
  initialProfile,
}: CampaignTabsProps) {
  const [tab, setTab] = useState<Tab>("email");

  return (
    <div className="rk-fade-up rk-delay-2">
      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-1 mb-6 p-1 rounded-xl w-full sm:w-fit"
        style={{ background: "var(--rk-surface)", border: "1px solid var(--rk-border)" }}
      >
        {/* Email Template tab */}
        <button
          onClick={() => setTab("email")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={
            tab === "email"
              ? {
                  background: "rgba(212,168,83,0.12)",
                  color: "var(--rk-gold)",
                  border: "1px solid rgba(212,168,83,0.25)",
                  boxShadow: "0 1px 3px rgba(212,168,83,0.08)",
                }
              : {
                  background: "transparent",
                  color: "var(--rk-text-muted)",
                  border: "1px solid transparent",
                }
          }
        >
          <SparkleIcon active={tab === "email"} />
          Email Template
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-0.5"
            style={{
              background: tab === "email" ? "rgba(212,168,83,0.15)" : "rgba(255,255,255,0.04)",
              color: tab === "email" ? "var(--rk-gold)" : "var(--rk-text-sub)",
              border: tab === "email" ? "1px solid rgba(212,168,83,0.2)" : "1px solid rgba(255,255,255,0.06)",
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
                  background: "rgba(212,168,83,0.12)",
                  color: "var(--rk-gold)",
                  border: "1px solid rgba(212,168,83,0.25)",
                }
              : {
                  background: "transparent",
                  color: "var(--rk-text-muted)",
                  border: "1px solid transparent",
                }
          }
        >
          <ContactsIcon active={tab === "contacts"} />
          Contacts
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-0.5 tabular-nums"
            style={{
              background: tab === "contacts" ? "rgba(212,168,83,0.15)" : "rgba(255,255,255,0.04)",
              color: tab === "contacts" ? "var(--rk-gold)" : "var(--rk-text-sub)",
              border: tab === "contacts" ? "1px solid rgba(212,168,83,0.2)" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {contacts.length}
          </span>
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
                style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
              >
                Contacts
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--rk-gold-dim)",
                  color: "var(--rk-gold)",
                  border: "1px solid rgba(212,168,83,0.2)",
                }}
              >
                {contacts.length}
              </span>
              <div className="ml-auto">
                <CsvImportButton campaignId={campaignId} />
              </div>
            </div>
            <ContactsTable contacts={contacts} campaignId={campaignId} />
          </div>

          {/* Add contact form */}
          <div className="lg:col-span-2">
            <h2
              className="text-sm font-semibold mb-3"
              style={{ fontFamily: "var(--font-display)", color: "var(--rk-text)" }}
            >
              Add Contact
            </h2>
            <AddContactForm campaignId={campaignId} />
          </div>
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
      style={{ color: active ? "var(--rk-gold)" : "var(--rk-text-muted)" }}
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
      style={{ color: active ? "var(--rk-gold)" : "var(--rk-text-muted)" }}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
