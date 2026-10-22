import { describe, expect, it } from "vitest";
import { getPaymentStatus } from "../types";
import { createMockApi } from "./mock-api";
import { buildPayments, MANDATES } from "./seed";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

const now = Date.parse("2026-10-22T12:00:00Z");

function setup(storage = memoryStorage(), outage = false) {
  return createMockApi({
    storage,
    latencyMs: 0,
    now: () => now,
    isOutage: () => outage,
  });
}

describe("mock payments API", () => {
  it("approves a pending payment and keeps the decision after a reload", async () => {
    const storage = memoryStorage();
    await setup(storage).decidePayment("pay_4KQ7", {
      decision: "approved",
      note: "  Fine  ",
    });

    const { payment } = await setup(storage).getPayment("pay_4KQ7");
    expect(payment.review).toMatchObject({
      decision: "approved",
      reviewer: "Jordan Lee",
      note: "Fine",
    });
  });

  it("requires a note to reject", async () => {
    await expect(
      setup().decidePayment("pay_4KQ7", { decision: "rejected", note: " " }),
    ).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("refuses to decide a payment twice", async () => {
    const api = setup();
    await api.decidePayment("pay_4KQ7", { decision: "approved", note: "" });
    await expect(
      api.decidePayment("pay_4KQ7", { decision: "rejected", note: "No" }),
    ).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("returns not_found for unknown payments", async () => {
    await expect(setup().getPayment("nope")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("fails every call during a simulated outage", async () => {
    await expect(
      setup(memoryStorage(), true).listPayments(),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("forgets decisions on reset", async () => {
    const storage = memoryStorage();
    const api = setup(storage);
    await api.decidePayment("pay_4KQ7", { decision: "approved", note: "" });
    api.reset();
    const { payment } = await api.getPayment("pay_4KQ7");
    expect(getPaymentStatus(payment)).toBe("needs_approval");
  });

  it("returns copies, so callers can't change the stored data", async () => {
    const api = setup();
    const [first] = await api.listPayments();
    first!.amount = "1";
    const [again] = await api.listPayments();
    expect(again!.amount).not.toBe("1");
  });
});

describe("seed data", () => {
  const payments = buildPayments(now);

  it("has unique payment IDs", () => {
    expect(new Set(payments.map((p) => p.id)).size).toBe(payments.length);
  });

  it("records rule hits that the mandates actually produce", () => {
    for (const p of payments) {
      for (const hit of p.policy.hits) {
        const rule = MANDATES.flatMap((m) => m.rules).find(
          (r) => r.id === hit.ruleId,
        );
        expect(rule?.kind, `${p.id}: ${hit.ruleId}`).toBe(hit.kind);
        if (hit.kind === "per_transaction_limit")
          expect(BigInt(hit.attempted)).toBeGreaterThan(BigInt(hit.limit));
        if (hit.kind === "daily_limit") {
          expect(
            BigInt(hit.spentBefore) + BigInt(hit.attempted),
          ).toBeGreaterThan(BigInt(hit.limit));
        }
        if (
          hit.kind === "payee_allowlist" &&
          rule?.kind === "payee_allowlist"
        ) {
          expect(rule.payeeIds).not.toContain(p.payee.id);
        }
        if (hit.kind === "velocity_limit")
          expect(hit.paymentsInWindow).toBeGreaterThanOrEqual(hit.maxPayments);
      }
    }
  });

  it("only settles payments that were approved", () => {
    for (const p of payments.filter((p) => p.settlement)) {
      expect(["approved", "auto_approved"]).toContain(getPaymentStatus(p));
    }
  });
});
