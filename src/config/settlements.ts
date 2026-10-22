import type { Address, Hash } from "viem";

/**
 * Real USDC transfers on Base Sepolia behind the demo's paid-out payments.
 * Their status, block, confirmations and amount are read live from the chain;
 * the rest of each payment (agent, policy check, approval) is mock data built
 * around them, all for the "API Credits Agent".
 *
 * To use your own transfers: get test USDC from https://faucet.circle.com,
 * send it on Base Sepolia, and replace the entries below. Each entry plays one
 * part, and settlements.test.ts checks that the amounts fit it:
 *   - "auto_approved": up to 5.00 USDC, to an approved payee. Passes every rule.
 *   - "over_limit":    more than 5.00 USDC, to an approved payee. Needed approval.
 *   - "new_payee":     up to 5.00 USDC, to a payee not used before. Needed approval.
 */
export interface SettlementConfig {
  story: "auto_approved" | "over_limit" | "new_payee";
  txHash: Hash;
  /** The amount sent, as a decimal string, e.g. "7.25". */
  amount: string;
  /** Any name you like, and the address the USDC was sent to. */
  payee: { name: string; address: Address };
  /** When the transaction was sent (ISO). Earlier timeline steps are placed shortly before it. */
  sentAt: string;
}

// The demo's own transfers, all sent from the agent wallet
// 0xF0B78BD8A069E2ca3CfeA65bff107bC97d35ad6C.
export const SETTLEMENTS: SettlementConfig[] = [
  {
    story: "auto_approved",
    txHash:
      "0x68038590ed702cf89fe870fa2b616678e0c2a9a52e5cdd5ebd22978f612bbc08",
    amount: "3",
    payee: {
      name: "Lumen Inference",
      address: "0xb363e6f55bfC14F75B06Be99863187b416b8Eb16",
    },
    sentAt: "2026-10-22T21:16:15Z",
  },
  {
    story: "over_limit",
    txHash:
      "0x1c3e454a797473606fbe75e7ae0f031cd246b32884859035972c7651bb13ee79",
    amount: "12",
    payee: {
      name: "Orbit Maps API",
      address: "0x7b11f253cdEe873Fec9505e45C98C4b1bd3C098B",
    },
    sentAt: "2026-10-22T21:18:32Z",
  },
  {
    story: "new_payee",
    txHash:
      "0x7f827918a41141390e14d0a7b07f474c9f3a0b5f991d23c791816c78dbc3dd41",
    amount: "4",
    payee: {
      name: "Parcel Data Co.",
      address: "0x5BE0904B0765959C0b7F96B5cF6CED3Faeb4Ed8C",
    },
    sentAt: "2026-10-22T21:19:41Z",
  },
];
