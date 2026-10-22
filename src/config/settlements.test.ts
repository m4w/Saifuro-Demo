import { isAddress, isHash } from "viem";
import { describe, expect, it } from "vitest";
import { usdc } from "@/lib/format/amount";
import { API_CREDITS_LIMIT } from "@/lib/api/mock/seed";
import { SETTLEMENTS } from "./settlements";

// Guards the hand-edited config: a wrong amount would make the policy story contradict itself.
describe("settlements config", () => {
  it.each(SETTLEMENTS)("$story: $txHash is well-formed", (s) => {
    expect(isHash(s.txHash)).toBe(true);
    expect(isAddress(s.payee.address)).toBe(true);
    expect(Number.isNaN(Date.parse(s.sentAt))).toBe(false);
    expect(BigInt(usdc(s.amount))).toBeGreaterThan(0n);
  });

  it.each(SETTLEMENTS)("$story: amount $amount fits the story", (s) => {
    const amount = BigInt(usdc(s.amount));
    if (s.story === "over_limit")
      expect(amount).toBeGreaterThan(BigInt(API_CREDITS_LIMIT));
    else expect(amount).toBeLessThanOrEqual(BigInt(API_CREDITS_LIMIT));
  });

  it("uses each transaction once", () => {
    const hashes = SETTLEMENTS.map((s) => s.txHash.toLowerCase());
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("doesn't reuse a new payee's name for an approved payee", () => {
    const approved = SETTLEMENTS.filter((s) => s.story !== "new_payee").map(
      (s) => s.payee.name,
    );
    for (const s of SETTLEMENTS.filter((s) => s.story === "new_payee")) {
      expect(approved).not.toContain(s.payee.name);
    }
  });
});
