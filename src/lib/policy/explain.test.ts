import { describe, expect, it } from "vitest";
import type { PolicyDecision, RuleHit } from "@/lib/api/types";
import { usdc } from "@/lib/format/amount";
import { describeRule, explainHit, explainPolicy } from "./explain";

const agent = "Procurement Agent";
const at = "2026-10-22T10:00:00Z";

const overLimit: RuleHit = {
  ruleId: "r1",
  kind: "per_transaction_limit",
  action: "require_approval",
  limit: usdc("500"),
  attempted: usdc("620"),
};
const newPayee: RuleHit = {
  ruleId: "r2",
  kind: "payee_allowlist",
  action: "require_approval",
  payeeName: "Helix Design",
};
const hardLimit: RuleHit = {
  ruleId: "r3",
  kind: "per_transaction_limit",
  action: "block",
  limit: usdc("5000"),
  attempted: usdc("7800"),
};

describe("explainHit", () => {
  it("names the limit, the agent and the difference for a per-transaction limit", () => {
    expect(explainHit(overLimit, agent)).toBe(
      "Exceeds the 500.00 USDC per-transaction limit for Procurement Agent by 120.00 USDC.",
    );
  });

  it("explains a daily limit with what was already spent", () => {
    const hit: RuleHit = {
      ruleId: "d",
      kind: "daily_limit",
      action: "require_approval",
      limit: usdc("2500"),
      spentBefore: usdc("1980"),
      attempted: usdc("960"),
    };
    expect(explainHit(hit, "Cloud Cost Agent")).toBe(
      "Cloud Cost Agent has already spent 1,980.00 USDC today. " +
        "This payment would bring the total to 2,940.00 USDC, 440.00 USDC over the 2,500.00 USDC daily limit.",
    );
  });

  it("explains a payee that isn't approved", () => {
    expect(explainHit(newPayee, agent)).toBe(
      "Helix Design isn't on Procurement Agent's list of approved payees.",
    );
  });

  it.each([
    [5, 5, 60, "6th payment in the last hour. The mandate allows 5."],
    [3, 3, 30, "4th payment in the last 30 minutes. The mandate allows 3."],
    [11, 10, 120, "12th payment in the last 2 hours. The mandate allows 10."],
    [21, 20, 60, "22nd payment in the last hour. The mandate allows 20."],
  ])(
    "explains payment frequency (%d earlier, max %d, %d min)",
    (paymentsInWindow, maxPayments, windowMinutes, expected) => {
      const hit: RuleHit = {
        ruleId: "v",
        kind: "velocity_limit",
        action: "require_approval",
        maxPayments,
        windowMinutes,
        paymentsInWindow,
      };
      expect(explainHit(hit, agent)).toBe(
        `This would be Procurement Agent's ${expected}`,
      );
    },
  );
});

describe("explainPolicy", () => {
  const decision = (
    outcome: PolicyDecision["outcome"],
    hits: RuleHit[],
  ): PolicyDecision => ({
    outcome,
    hits,
    evaluatedAt: at,
  });

  it("counts the rules that need approval", () => {
    expect(
      explainPolicy(decision("needs_approval", [overLimit]), agent).headline,
    ).toBe(
      "Breaks 1 rule in Procurement Agent's mandate, so a person has to approve it.",
    );
    expect(
      explainPolicy(decision("needs_approval", [overLimit, newPayee]), agent)
        .headline,
    ).toBe(
      "Breaks 2 rules in Procurement Agent's mandate, so a person has to approve it.",
    );
  });

  it("puts blocking rules first and marks them", () => {
    const { headline, reasons } = explainPolicy(
      decision("blocked", [newPayee, hardLimit]),
      agent,
    );
    expect(headline).toMatch(/^Blocked by the mandate/);
    expect(reasons.map((r) => [r.label, r.blocking])).toEqual([
      ["Per-transaction limit", true],
      ["New payee", false],
    ]);
  });

  it("explains automatic approval without reasons", () => {
    const result = explainPolicy(decision("auto_approved", []), agent);
    expect(result.headline).toBe(
      "Approved automatically. This payment is within every rule in Procurement Agent's mandate.",
    );
    expect(result.reasons).toEqual([]);
  });
});

describe("describeRule", () => {
  it("says what happens when the rule is broken", () => {
    expect(
      describeRule({
        id: "a",
        kind: "per_transaction_limit",
        limit: usdc("5000"),
        onBreach: "block",
      }),
    ).toBe("Any single payment over 5,000.00 USDC is blocked.");
    expect(
      describeRule({
        id: "b",
        kind: "velocity_limit",
        maxPayments: 5,
        windowMinutes: 60,
        onBreach: "require_approval",
      }),
    ).toBe("More than 5 payments per hour needs approval.");
  });
});
