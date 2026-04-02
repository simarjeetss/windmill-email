/** Free-tier AI generation limit (shared between server actions and UI). */
export const FREE_AI_LIMIT = 15;

export interface AiUsageResult {
  /** Current count AFTER this call (if allowed) */
  count: number;
  /** true when the user has exceeded their free-tier limit */
  limitExceeded: boolean;
  error?: string;
}
