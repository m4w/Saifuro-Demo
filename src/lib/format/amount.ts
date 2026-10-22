import { parseUnits } from "viem";
import type { UsdcAmount } from "@/lib/api/types";
import { USDC_DECIMALS } from "@/lib/chain/usdc";

const grouping = new Intl.NumberFormat("en-US");

/** "1240.5" → "1240500000". For writing seed data and config by hand. */
export function usdc(decimal: string): UsdcAmount {
  return parseUnits(decimal, USDC_DECIMALS).toString();
}

/**
 * Formats a non-negative amount in base units as "1,240.50 USDC".
 * Rounds half-up to the cent; USDC itself has 6 decimals.
 */
export function formatUsdc(amount: UsdcAmount | bigint): string {
  const units = typeof amount === "bigint" ? amount : BigInt(amount);
  const cents = (units + 5_000n) / 10_000n;
  const whole = grouping.format(cents / 100n);
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction} USDC`;
}
