import type {
  MandateRule,
  PolicyDecision,
  RuleHit,
  RuleKind,
} from "@/lib/api/types";
import { formatUsdc } from "@/lib/format/amount";

/** Short name of a triggered rule, for badges and the queue. */
export const RULE_LABELS: Record<RuleKind, string> = {
  per_transaction_limit: "Per-transaction limit",
  daily_limit: "Daily limit",
  payee_allowlist: "New payee",
  velocity_limit: "Payment frequency",
};

export interface PolicyExplanation {
  headline: string;
  reasons: { ruleId: string; label: string; text: string; blocking: boolean }[];
}

export function explainPolicy(
  decision: PolicyDecision,
  agentName: string,
): PolicyExplanation {
  // Rules that block come first: they are the reason nothing else matters.
  const hits = [...decision.hits].sort(
    (a, b) => Number(b.action === "block") - Number(a.action === "block"),
  );
  const reasons = hits.map((hit) => ({
    ruleId: hit.ruleId,
    label: RULE_LABELS[hit.kind],
    text: explainHit(hit, agentName),
    blocking: hit.action === "block",
  }));

  switch (decision.outcome) {
    case "auto_approved":
      return {
        headline: `Approved automatically. This payment is within every rule in ${agentName}'s mandate.`,
        reasons,
      };
    case "blocked":
      return {
        headline:
          "Blocked by the mandate. This payment breaks a rule that can't be overridden by approval.",
        reasons,
      };
    case "needs_approval":
      return {
        headline: `Breaks ${hits.length === 1 ? "1 rule" : `${hits.length} rules`} in ${agentName}'s mandate, so a person has to approve it.`,
        reasons,
      };
  }
}

export function explainHit(hit: RuleHit, agentName: string): string {
  switch (hit.kind) {
    case "per_transaction_limit": {
      const over = BigInt(hit.attempted) - BigInt(hit.limit);
      return `Exceeds the ${formatUsdc(hit.limit)} per-transaction limit for ${agentName} by ${formatUsdc(over)}.`;
    }
    case "daily_limit": {
      const total = BigInt(hit.spentBefore) + BigInt(hit.attempted);
      const over = total - BigInt(hit.limit);
      return (
        `${agentName} has already spent ${formatUsdc(hit.spentBefore)} today. ` +
        `This payment would bring the total to ${formatUsdc(total)}, ` +
        `${formatUsdc(over)} over the ${formatUsdc(hit.limit)} daily limit.`
      );
    }
    case "payee_allowlist":
      return `${hit.payeeName} isn't on ${agentName}'s list of approved payees.`;
    case "velocity_limit":
      return (
        `This would be ${agentName}'s ${ordinal(hit.paymentsInWindow + 1)} payment in the last ${formatWindow(hit.windowMinutes)}. ` +
        `The mandate allows ${hit.maxPayments}.`
      );
  }
}

/** One-line description of a mandate rule, for the mandate overview. */
export function describeRule(rule: MandateRule): string {
  const consequence =
    rule.onBreach === "block" ? "is blocked" : "needs approval";
  switch (rule.kind) {
    case "per_transaction_limit":
      return `Any single payment over ${formatUsdc(rule.limit)} ${consequence}.`;
    case "daily_limit":
      return `Spending over ${formatUsdc(rule.limit)} in one day ${consequence}.`;
    case "payee_allowlist":
      return `Paying anyone outside the ${rule.payeeIds.length} approved payees ${consequence}.`;
    case "velocity_limit": {
      const window =
        rule.windowMinutes === 60
          ? "per hour"
          : `within ${formatWindow(rule.windowMinutes)}`;
      return `More than ${rule.maxPayments} payments ${window} ${consequence}.`;
    }
  }
}

/** "hour", "2 hours", "30 minutes": reads as "in the last …". */
function formatWindow(minutes: number): string {
  if (minutes === 60) return "hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th");
  return `${n}${suffix}`;
}
