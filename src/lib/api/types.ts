import type { Address, Hash } from "viem";

/**
 * Domain types for the demo's mock backend. They are designed for this demo
 * and are not a copy of any real product's API.
 */

/** Integer string in USDC base units (6 decimals): "500000000" = 500.00 USDC. Never a float. */
export type UsdcAmount = string;

/** ISO 8601 timestamp. */
export type IsoDate = string;

export type Network = "base-sepolia";

export interface Agent {
  id: string;
  name: string;
  team: string;
  description: string;
  mandateId: string;
}

export interface Payee {
  id: string;
  name: string;
  address: Address;
}

/** What happens when a payment breaks a rule. */
export type RuleAction = "require_approval" | "block";

export type MandateRule =
  | {
      id: string;
      kind: "per_transaction_limit";
      limit: UsdcAmount;
      onBreach: RuleAction;
    }
  | { id: string; kind: "daily_limit"; limit: UsdcAmount; onBreach: RuleAction }
  | {
      id: string;
      kind: "payee_allowlist";
      payeeIds: string[];
      onBreach: RuleAction;
    }
  | {
      id: string;
      kind: "velocity_limit";
      maxPayments: number;
      windowMinutes: number;
      onBreach: RuleAction;
    };

export type RuleKind = MandateRule["kind"];

/** A spending mandate a person approved for one agent. */
export interface Mandate {
  id: string;
  agentId: string;
  approvedBy: string;
  approvedAt: IsoDate;
  rules: MandateRule[];
}

/**
 * A rule a payment broke, with the facts recorded when the policy ran,
 * so the explanation stays the same even if the mandate changes later.
 */
export type RuleHit =
  | {
      ruleId: string;
      kind: "per_transaction_limit";
      action: RuleAction;
      limit: UsdcAmount;
      attempted: UsdcAmount;
    }
  | {
      ruleId: string;
      kind: "daily_limit";
      action: RuleAction;
      limit: UsdcAmount;
      spentBefore: UsdcAmount;
      attempted: UsdcAmount;
    }
  | {
      ruleId: string;
      kind: "payee_allowlist";
      action: RuleAction;
      payeeName: string;
    }
  | {
      ruleId: string;
      kind: "velocity_limit";
      action: RuleAction;
      maxPayments: number;
      windowMinutes: number;
      paymentsInWindow: number;
    };

export interface PolicyDecision {
  outcome: "auto_approved" | "needs_approval" | "blocked";
  hits: RuleHit[];
  evaluatedAt: IsoDate;
}

export interface Review {
  decision: "approved" | "rejected";
  reviewer: string;
  at: IsoDate;
  note: string;
}

export interface Settlement {
  network: Network;
  txHash: Hash;
}

export interface Payment {
  id: string;
  agentId: string;
  payee: Payee;
  amount: UsdcAmount;
  purpose: string;
  network: Network;
  requestedAt: IsoDate;
  policy: PolicyDecision;
  review: Review | null;
  /** Set once the payment was sent onchain. */
  settlement: Settlement | null;
}

export type PaymentStatus =
  "needs_approval" | "approved" | "rejected" | "auto_approved" | "blocked";

export interface PaymentListItem extends Payment {
  agent: Agent;
}

export interface PaymentDetail {
  payment: Payment;
  agent: Agent;
  mandate: Mandate;
}

export interface DecisionInput {
  decision: Review["decision"];
  note: string;
}

export function getPaymentStatus(payment: Payment): PaymentStatus {
  if (payment.review) return payment.review.decision;
  if (payment.policy.outcome === "needs_approval") return "needs_approval";
  return payment.policy.outcome;
}
