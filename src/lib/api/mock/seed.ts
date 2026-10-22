import { getAddress, keccak256, toHex, type Address } from "viem";
import { SETTLEMENTS, type SettlementConfig } from "@/config/settlements";
import { usdc } from "@/lib/format/amount";
import type {
  Agent,
  Mandate,
  MandateRule,
  Payee,
  Payment,
  PolicyDecision,
  Review,
  RuleHit,
  UsdcAmount,
} from "../types";

/** The signed-in demo user. */
export const REVIEWER = "Jordan Lee";
export const API_CREDITS_LIMIT = usdc("5");

const MINUTE = 60_000;

/** A made-up but valid address, derived from the payee's name. Mock payees never receive anything. */
function mockPayee(name: string): Payee {
  return {
    id: slug(name),
    name,
    address: getAddress(keccak256(toHex(name)).slice(0, 42)),
  };
}

function realPayee(name: string, address: Address): Payee {
  return { id: slug(name), name, address };
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// --- Payees ---------------------------------------------------------------

const northwind = mockPayee("Northwind Office Supply");
const seatbase = mockPayee("Seatbase");
const paperline = mockPayee("Paperline");
const helix = mockPayee("Helix Design Studio");
const quickprint = mockPayee("Quickprint Express");
const meridian = mockPayee("Meridian Air");
const harborview = mockPayee("Harborview Hotels");
const stratus = mockPayee("Stratus Cloud");
const fathom = mockPayee("Fathom Monitoring");
const vector = mockPayee("Vector Search API");

const settled = SETTLEMENTS.map((s) => ({
  ...s,
  payeeRecord: realPayee(s.payee.name, s.payee.address),
}));

// --- Agents and mandates --------------------------------------------------

type Rule<K extends MandateRule["kind"]> = Extract<MandateRule, { kind: K }>;

const rules = {
  procurement: {
    perTx: {
      id: "rule_proc_tx",
      kind: "per_transaction_limit",
      limit: usdc("500"),
      onBreach: "require_approval",
    },
    daily: {
      id: "rule_proc_day",
      kind: "daily_limit",
      limit: usdc("2000"),
      onBreach: "require_approval",
    },
    payees: {
      id: "rule_proc_payees",
      kind: "payee_allowlist",
      payeeIds: [northwind.id, seatbase.id, paperline.id],
      onBreach: "require_approval",
    },
    velocity: {
      id: "rule_proc_rate",
      kind: "velocity_limit",
      maxPayments: 5,
      windowMinutes: 60,
      onBreach: "require_approval",
    },
  },
  travel: {
    perTx: {
      id: "rule_trav_tx",
      kind: "per_transaction_limit",
      limit: usdc("800"),
      onBreach: "require_approval",
    },
    hardCap: {
      id: "rule_trav_cap",
      kind: "per_transaction_limit",
      limit: usdc("5000"),
      onBreach: "block",
    },
    daily: {
      id: "rule_trav_day",
      kind: "daily_limit",
      limit: usdc("3000"),
      onBreach: "require_approval",
    },
  },
  cloud: {
    perTx: {
      id: "rule_cloud_tx",
      kind: "per_transaction_limit",
      limit: usdc("1000"),
      onBreach: "require_approval",
    },
    daily: {
      id: "rule_cloud_day",
      kind: "daily_limit",
      limit: usdc("2500"),
      onBreach: "require_approval",
    },
    payees: {
      id: "rule_cloud_payees",
      kind: "payee_allowlist",
      payeeIds: [stratus.id, fathom.id],
      onBreach: "require_approval",
    },
  },
  credits: {
    perTx: {
      id: "rule_cred_tx",
      kind: "per_transaction_limit",
      limit: API_CREDITS_LIMIT,
      onBreach: "require_approval",
    },
    daily: {
      id: "rule_cred_day",
      kind: "daily_limit",
      limit: usdc("50"),
      onBreach: "require_approval",
    },
    payees: {
      id: "rule_cred_payees",
      kind: "payee_allowlist",
      payeeIds: settled
        .filter((s) => s.story !== "new_payee")
        .map((s) => s.payeeRecord.id),
      onBreach: "require_approval",
    },
  },
} satisfies Record<string, Record<string, MandateRule>>;

export const AGENTS: Agent[] = [
  {
    id: "agent_procurement",
    name: "Procurement Agent",
    team: "Operations",
    description: "Orders office supplies and software seats.",
    mandateId: "mandate_procurement",
  },
  {
    id: "agent_travel",
    name: "Travel Booking Agent",
    team: "People Ops",
    description: "Books flights and hotels for business trips.",
    mandateId: "mandate_travel",
  },
  {
    id: "agent_cloud",
    name: "Cloud Cost Agent",
    team: "Engineering",
    description: "Pays monthly infrastructure and tooling invoices.",
    mandateId: "mandate_cloud",
  },
  {
    id: "agent_credits",
    name: "API Credits Agent",
    team: "Engineering",
    description:
      "Buys API credits for internal tools, a few dollars at a time.",
    mandateId: "mandate_credits",
  },
];

const [procurement, travel, cloud, credits] = AGENTS as [
  Agent,
  Agent,
  Agent,
  Agent,
];

export const MANDATES: Mandate[] = [
  mandate(procurement, "Priya Shah", "2026-09-03T09:12:00Z", rules.procurement),
  mandate(travel, "Priya Shah", "2026-08-21T14:40:00Z", rules.travel),
  mandate(cloud, "Sam Okafor", "2026-07-30T11:05:00Z", rules.cloud),
  mandate(credits, "Sam Okafor", "2026-10-01T08:30:00Z", rules.credits),
];

function mandate(
  agent: Agent,
  approvedBy: string,
  approvedAt: string,
  set: Record<string, MandateRule>,
): Mandate {
  return {
    id: agent.mandateId,
    agentId: agent.id,
    approvedBy,
    approvedAt,
    rules: Object.values(set),
  };
}

// --- Rule hits ------------------------------------------------------------

const overTx = (
  rule: Rule<"per_transaction_limit">,
  attempted: UsdcAmount,
): RuleHit => ({
  ruleId: rule.id,
  kind: rule.kind,
  action: rule.onBreach,
  limit: rule.limit,
  attempted,
});
const overDay = (
  rule: Rule<"daily_limit">,
  spentBefore: string,
  attempted: UsdcAmount,
): RuleHit => ({
  ruleId: rule.id,
  kind: rule.kind,
  action: rule.onBreach,
  limit: rule.limit,
  spentBefore: usdc(spentBefore),
  attempted,
});
const notListed = (rule: Rule<"payee_allowlist">, payee: Payee): RuleHit => ({
  ruleId: rule.id,
  kind: rule.kind,
  action: rule.onBreach,
  payeeName: payee.name,
});
const tooFrequent = (
  rule: Rule<"velocity_limit">,
  paymentsInWindow: number,
): RuleHit => ({
  ruleId: rule.id,
  kind: rule.kind,
  action: rule.onBreach,
  maxPayments: rule.maxPayments,
  windowMinutes: rule.windowMinutes,
  paymentsInWindow,
});

// --- Payments -------------------------------------------------------------

interface Draft {
  id: string;
  agent: Agent;
  payee: Payee;
  amount: UsdcAmount;
  purpose: string;
  requestedAt: number;
  hits: (amount: UsdcAmount) => RuleHit[];
  review?: Omit<Review, "at"> & { minutesLater: number };
}

function build(draft: Draft): Payment {
  const hits = draft.hits(draft.amount);
  const outcome: PolicyDecision["outcome"] = hits.some(
    (h) => h.action === "block",
  )
    ? "blocked"
    : hits.length
      ? "needs_approval"
      : "auto_approved";
  const { review } = draft;
  return {
    id: draft.id,
    agentId: draft.agent.id,
    payee: draft.payee,
    amount: draft.amount,
    purpose: draft.purpose,
    network: "base-sepolia",
    requestedAt: new Date(draft.requestedAt).toISOString(),
    policy: {
      outcome,
      hits,
      evaluatedAt: new Date(draft.requestedAt + 1_000).toISOString(),
    },
    review: review
      ? {
          decision: review.decision,
          reviewer: review.reviewer,
          note: review.note,
          at: new Date(
            draft.requestedAt + review.minutesLater * MINUTE,
          ).toISOString(),
        }
      : null,
    settlement: null,
  };
}

/** All payments, with times relative to `now` so the queue always looks current. */
export function buildPayments(now: number): Payment[] {
  const ago = (minutes: number) => now - minutes * MINUTE;
  const p = rules.procurement;
  const t = rules.travel;
  const c = rules.cloud;
  const k = rules.credits;

  const pending: Draft[] = [
    {
      id: "pay_4KQ7",
      agent: procurement,
      payee: northwind,
      amount: usdc("620"),
      purpose: "Ergonomic chairs for the Berlin office (8 units)",
      requestedAt: ago(47),
      hits: (a) => [overTx(p.perTx, a)],
    },
    {
      id: "pay_8VX2",
      agent: cloud,
      payee: stratus,
      amount: usdc("1840"),
      purpose: "October compute invoice",
      requestedAt: ago(125),
      hits: (a) => [overTx(c.perTx, a)],
    },
    {
      id: "pay_2MJ9",
      agent: travel,
      payee: meridian,
      amount: usdc("1129.40"),
      purpose: "Return flights Lisbon to New York, sales offsite",
      requestedAt: ago(312),
      hits: (a) => [overTx(t.perTx, a)],
    },
    {
      id: "pay_6TR3",
      agent: procurement,
      payee: helix,
      amount: usdc("350"),
      purpose: "Logo refresh, first milestone",
      requestedAt: ago(18),
      hits: () => [notListed(p.payees, helix)],
    },
    {
      id: "pay_9HC5",
      agent: cloud,
      payee: fathom,
      amount: usdc("960"),
      purpose: "Annual monitoring plan, prorated",
      requestedAt: ago(92),
      hits: (a) => [overDay(c.daily, "1980", a)],
    },
    {
      id: "pay_3WD8",
      agent: credits,
      payee: vector,
      amount: usdc("12"),
      purpose: "Credits for rebuilding the docs search index",
      requestedAt: ago(9),
      hits: (a) => [overTx(k.perTx, a), notListed(k.payees, vector)],
    },
    {
      id: "pay_5NB1",
      agent: procurement,
      payee: northwind,
      amount: usdc("180"),
      purpose: "Printer toner, reorder",
      requestedAt: ago(26),
      hits: () => [tooFrequent(p.velocity, 5)],
    },
    {
      id: "pay_7FL4",
      agent: travel,
      payee: harborview,
      amount: usdc("2310"),
      purpose: "Hotel block for the offsite, 3 rooms for 6 nights",
      requestedAt: ago(26 * 60 + 4),
      hits: (a) => [overTx(t.perTx, a), overDay(t.daily, "1240", a)],
    },
    {
      id: "pay_1ZS6",
      agent: procurement,
      payee: seatbase,
      amount: usdc("540"),
      purpose: "Design tool seats, annual renewal (12 seats)",
      requestedAt: ago(220),
      hits: (a) => [overTx(p.perTx, a), overDay(p.daily, "1620", a)],
    },
  ];

  const decided: Draft[] = [
    {
      id: "pay_0RJ2",
      agent: cloud,
      payee: stratus,
      amount: usdc("1500"),
      purpose: "September compute invoice",
      requestedAt: ago(2 * 24 * 60 + 35),
      hits: (a) => [overTx(c.perTx, a)],
      review: {
        decision: "rejected",
        reviewer: "Priya Shah",
        note: "Duplicate of the September invoice, which was already paid.",
        minutesLater: 22,
      },
    },
    {
      id: "pay_0BK7",
      agent: travel,
      payee: meridian,
      amount: usdc("6480"),
      purpose: "Business class upgrade for the offsite flights",
      requestedAt: ago(24 * 60 + 15),
      hits: (a) => [overTx(t.hardCap, a), overTx(t.perTx, a)],
    },
    {
      id: "pay_0QP5",
      agent: procurement,
      payee: quickprint,
      amount: usdc("95"),
      purpose: "Flyers for the hiring event",
      requestedAt: ago(3 * 24 * 60 + 200),
      hits: () => [notListed(p.payees, quickprint)],
      review: {
        decision: "rejected",
        reviewer: REVIEWER,
        note: "Not a supplier we use. Please order through Northwind instead.",
        minutesLater: 41,
      },
    },
  ];

  return [...pending, ...decided].map(build).concat(settled.map(buildSettled));
}

function buildSettled(
  s: SettlementConfig & { payeeRecord: Payee },
  index: number,
): Payment {
  const k = rules.credits;
  const sentAt = Date.parse(s.sentAt);
  const amount = usdc(s.amount);
  const purposes = {
    auto_approved: "Top-up for the support chatbot",
    over_limit: "Monthly geocoding credits for the delivery tracker",
    new_payee: "Trial credits for a new data provider",
  } as const;

  const payment = build({
    id: `pay_S${index + 1}`,
    agent: credits,
    payee: s.payeeRecord,
    amount,
    purpose: purposes[s.story],
    // Auto-approved payments go out within seconds; reviewed ones waited for a person.
    requestedAt: sentAt - (s.story === "auto_approved" ? 10_000 : 14 * MINUTE),
    hits: (a) =>
      s.story === "over_limit"
        ? [overTx(k.perTx, a)]
        : s.story === "new_payee"
          ? [notListed(k.payees, s.payeeRecord)]
          : [],
    review:
      s.story === "auto_approved"
        ? undefined
        : {
            decision: "approved",
            reviewer: "Sam Okafor",
            note:
              s.story === "over_limit"
                ? "Expected: the monthly top-up is larger than usual top-ups."
                : "Approved for a one-off trial. Add them to the payee list if we keep using them.",
            minutesLater: 13,
          },
  });
  return {
    ...payment,
    settlement: { network: "base-sepolia", txHash: s.txHash },
  };
}
