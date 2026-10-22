import { describe, expect, it } from "vitest";
import type { Payment, PolicyDecision, Review } from "@/lib/api/types";
import type { OnchainStatus } from "@/lib/chain/settlement";
import { usdc } from "@/lib/format/amount";
import { buildTimeline, type StepState } from "./build-timeline";

const T = "2026-10-22T10:00:00Z";
const needsApproval: PolicyDecision = {
  outcome: "needs_approval",
  evaluatedAt: T,
  hits: [
    {
      ruleId: "r",
      kind: "per_transaction_limit",
      action: "require_approval",
      limit: usdc("5"),
      attempted: usdc("7.25"),
    },
  ],
};
const approved: Review = {
  decision: "approved",
  reviewer: "Jordan Lee",
  at: T,
  note: "",
};
const txHash = `0x${"ab".repeat(32)}` as const;

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay_1",
    agentId: "agent_1",
    payee: {
      id: "p",
      name: "Lumen Inference",
      address: "0x2222222222222222222222222222222222222222",
    },
    amount: usdc("7.25"),
    purpose: "API credits",
    network: "base-sepolia",
    requestedAt: T,
    policy: needsApproval,
    review: null,
    settlement: null,
    ...overrides,
  };
}

const settled = (policy = needsApproval, review: Review | null = approved) =>
  payment({ policy, review, settlement: { network: "base-sepolia", txHash } });

const recorded = (finalized: boolean | null): OnchainStatus => ({
  state: "recorded",
  blockNumber: 100n,
  recordedAt: T,
  transfers: [],
  confirmations: finalized === null ? null : 10n,
  finalized,
});

const states = (
  p: Payment,
  onchain: OnchainStatus | null = null,
): StepState[] =>
  buildTimeline(p, "API Credits Agent", onchain).map((s) => s.state);

describe("buildTimeline", () => {
  it.each<[string, Payment, OnchainStatus | null, StepState[]]>([
    [
      "waiting for review",
      payment(),
      null,
      ["complete", "complete", "current", "upcoming", "upcoming"],
    ],
    [
      "rejected",
      payment({ review: { ...approved, decision: "rejected" } }),
      null,
      ["complete", "complete", "failed", "skipped", "skipped"],
    ],
    [
      "blocked by the mandate",
      payment({ policy: { ...needsApproval, outcome: "blocked" } }),
      null,
      ["complete", "failed", "skipped", "skipped", "skipped"],
    ],
    [
      "approved in this demo, not sent",
      payment({ review: approved }),
      null,
      ["complete", "complete", "complete", "upcoming", "upcoming"],
    ],
    [
      "checking the network",
      settled(),
      { state: "loading" },
      ["complete", "complete", "complete", "current", "upcoming"],
    ],
    [
      "RPC unavailable",
      settled(),
      { state: "unavailable" },
      ["complete", "complete", "complete", "unknown", "unknown"],
    ],
    [
      "sent but not recorded yet",
      settled(),
      { state: "not_found" },
      ["complete", "complete", "complete", "current", "upcoming"],
    ],
    [
      "reverted onchain",
      settled(),
      { state: "reverted", blockNumber: 100n, recordedAt: T },
      ["complete", "complete", "complete", "failed", "skipped"],
    ],
    [
      "recorded, not final yet",
      settled(),
      recorded(false),
      ["complete", "complete", "complete", "complete", "current"],
    ],
    [
      "recorded, finality unknown",
      settled(),
      recorded(null),
      ["complete", "complete", "complete", "complete", "current"],
    ],
    [
      "final",
      settled(),
      recorded(true),
      ["complete", "complete", "complete", "complete", "complete"],
    ],
    [
      "auto-approved and final",
      settled({ outcome: "auto_approved", hits: [], evaluatedAt: T }, null),
      recorded(true),
      ["complete", "complete", "skipped", "complete", "complete"],
    ],
  ])("%s", (_, p, onchain, expected) => {
    expect(states(p, onchain)).toEqual(expected);
  });

  it("never has more than one current step", () => {
    const cases: [Payment, OnchainStatus | null][] = [
      [payment(), null],
      [settled(), { state: "not_found" }],
      [settled(), recorded(false)],
    ];
    for (const [p, onchain] of cases) {
      expect(
        states(p, onchain).filter((s) => s === "current").length,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("describes each step in plain language", () => {
    const steps = buildTimeline(
      settled(),
      "API Credits Agent",
      recorded(false),
    );
    expect(steps.map((s) => [s.label, s.description])).toEqual([
      [
        "Requested",
        "API Credits Agent asked to pay 7.25 USDC to Lumen Inference.",
      ],
      ["Policy check", "Needs approval: 1 rule broken."],
      ["Human approval", "Approved by Jordan Lee."],
      ["Sent on Base", "Recorded on Base."],
      [
        "Confirmed",
        "Recorded, becoming final. This usually takes about 20 minutes.",
      ],
    ]);
  });

  it("says an approved payment isn't sent in this demo", () => {
    const sent = buildTimeline(payment({ review: approved }), "x", null)[3];
    expect(sent?.description).toBe(
      "Approved. This demo doesn't send payments, so it ends here.",
    );
  });

  it("uses the block time for the onchain step", () => {
    const steps = buildTimeline(settled(), "x", {
      ...recorded(true),
      recordedAt: "2026-10-22T10:05:00Z",
    } as OnchainStatus);
    expect(steps[3]?.at).toBe("2026-10-22T10:05:00Z");
  });
});
