/**
 * Smart column mapper — auto-detects which spreadsheet columns map to
 * the contact fields: email, first_name, last_name, company.
 *
 * Works with messy real-world headers like "Email Address", "Full Name",
 * "Organisation", "E-mail", "Contact Email", etc.
 */

// ─── Target fields ──────────────────────────────────────────────────────────

export type ContactField = "email" | "first_name" | "last_name" | "company" | "full_name";

export type ColumnMapping = Record<ContactField, string | null>;

// ─── Keyword patterns for each field ────────────────────────────────────────

const FIELD_PATTERNS: Record<ContactField, RegExp[]> = {
  email: [
    /^e[\-_\s]?mail$/i,
    /email[\-_\s]?addr/i,
    /e[\-_\s]?mail[\-_\s]?id/i,
    /contact[\-_\s]?email/i,
    /^email$/i,
  ],
  first_name: [
    /^first[\-_\s]?name$/i,
    /^fname$/i,
    /^given[\-_\s]?name$/i,
    /^first$/i,
    /^prenom$/i,
  ],
  last_name: [
    /^last[\-_\s]?name$/i,
    /^lname$/i,
    /^surname$/i,
    /^family[\-_\s]?name$/i,
    /^last$/i,
  ],
  full_name: [
    /^full[\-_\s]?name$/i,
    /^name$/i,
    /^contact[\-_\s]?name$/i,
    /^person$/i,
    /^display[\-_\s]?name$/i,
  ],
  company: [
    /^company$/i,
    /^org(anisation|anization)?$/i,
    /^employer$/i,
    /^firm$/i,
    /^business$/i,
    /^company[\-_\s]?name$/i,
    /^org[\-_\s]?name$/i,
    /^work[\-_\s]?place$/i,
    /^institution$/i,
  ],
};

// ─── Content-based heuristic for email column ───────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function looksLikeEmail(values: string[]): boolean {
  // If > 60% of non-empty values look like emails, it's probably the email col
  const nonEmpty = values.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return false;
  const emailCount = nonEmpty.filter((v) => EMAIL_RE.test(v)).length;
  return emailCount / nonEmpty.length > 0.6;
}

// ─── Auto-map ───────────────────────────────────────────────────────────────

/**
 * Given a list of spreadsheet headers and sample rows, return the best-guess
 * mapping of headers → contact fields.
 */
export function autoMapColumns(
  headers: string[],
  sampleRows: Record<string, string>[] = []
): ColumnMapping {
  const mapping: ColumnMapping = {
    email: null,
    first_name: null,
    last_name: null,
    company: null,
    full_name: null,
  };

  const used = new Set<string>(); // avoid mapping two fields to the same col

  // Pass 1: match by header name patterns
  for (const field of Object.keys(FIELD_PATTERNS) as ContactField[]) {
    for (const header of headers) {
      if (used.has(header)) continue;
      const normalised = header.trim();
      if (FIELD_PATTERNS[field].some((re) => re.test(normalised))) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }

  // Pass 2: if email is still unmapped, use content heuristic
  if (!mapping.email && sampleRows.length > 0) {
    for (const header of headers) {
      if (used.has(header)) continue;
      const values = sampleRows.map((r) => r[header] ?? "");
      if (looksLikeEmail(values)) {
        mapping.email = header;
        used.add(header);
        break;
      }
    }
  }

  return mapping;
}

// ─── Apply mapping to rows ──────────────────────────────────────────────────

export type MappedContact = {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
};

/**
 * Split a "full name" string into first and last name parts.
 * Handles: "John Smith", "Smith, John", "John"
 */
export function splitFullName(name: string): { first: string; last: string } {
  const trimmed = name.trim();
  if (!trimmed) return { first: "", last: "" };

  // Handle "Last, First" format
  if (trimmed.includes(",")) {
    const [last, ...rest] = trimmed.split(",");
    return { first: rest.join(",").trim(), last: last.trim() };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Apply a column mapping to raw rows, producing normalised contacts.
 */
export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): MappedContact[] {
  return rows
    .map((row) => {
      const email = mapping.email ? (row[mapping.email] ?? "").trim() : "";

      let first_name = mapping.first_name ? (row[mapping.first_name] ?? "").trim() : "";
      let last_name = mapping.last_name ? (row[mapping.last_name] ?? "").trim() : "";

      // If we have a full_name column but no first/last, split it
      if (mapping.full_name && !mapping.first_name && !mapping.last_name) {
        const full = (row[mapping.full_name] ?? "").trim();
        const { first, last } = splitFullName(full);
        first_name = first;
        last_name = last;
      }

      const company = mapping.company ? (row[mapping.company] ?? "").trim() : "";

      return {
        email,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        company: company || undefined,
      };
    })
    .filter((c) => c.email && EMAIL_RE.test(c.email));
}
