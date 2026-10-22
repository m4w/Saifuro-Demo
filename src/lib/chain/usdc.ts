import { baseSepolia } from "viem/chains";

/**
 * USDC on Base Sepolia.
 * Source: Circle, "USDC Contract Addresses" → Testnet → Base Sepolia
 * https://developers.circle.com/stablecoins/usdc-contract-addresses (checked 2026-10-22)
 */
export const USDC_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const USDC_DECIMALS = 6;

export const chain = baseSepolia;

export function explorerTxUrl(hash: string): string {
  return `${chain.blockExplorers.default.url}/tx/${hash}`;
}
