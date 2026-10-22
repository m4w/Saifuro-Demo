import { queryOptions } from "@tanstack/react-query";
import { createPublicClient, http, type Hash } from "viem";
import { getScenarios } from "@/lib/demo/scenarios";
import { readChainHead, readReceipt, type ReceiptRead } from "./settlement";
import { chain } from "./usdc";

/** Read-only client. Uses the public Base Sepolia RPC unless another URL is configured. */
const client = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || undefined, {
    retryCount: 1,
    timeout: 8_000,
  }),
});

const SIMULATED_OUTAGE = "Simulated outage: the Base network is unreachable.";

export const chainKeys = {
  all: ["chain"] as const,
  receipt: (hash: Hash) => ["chain", "receipt", hash] as const,
  head: ["chain", "head"] as const,
};

export const receiptQuery = (hash: Hash) =>
  queryOptions({
    queryKey: chainKeys.receipt(hash),
    queryFn: async (): Promise<ReceiptRead> => {
      const scenarios = getScenarios();
      if (scenarios.has("rpc_outage")) throw new Error(SIMULATED_OUTAGE);
      if (scenarios.has("tx_unconfirmed")) return { state: "not_found" };
      return readReceipt(client, hash);
    },
    // A recorded receipt never changes. Until then, check again every few seconds.
    staleTime: (query) =>
      query.state.data?.state === "not_found" ? 0 : Infinity,
    refetchInterval: (query) =>
      query.state.data?.state === "not_found" ? 4_000 : false,
    retry: 1,
  });

/** Newest and final block, polled for confirmations. Pauses while the tab is hidden. */
export const chainHeadQuery = queryOptions({
  queryKey: chainKeys.head,
  queryFn: () => {
    if (getScenarios().has("rpc_outage")) throw new Error(SIMULATED_OUTAGE);
    return readChainHead(client);
  },
  refetchInterval: 6_000,
  retry: 1,
});
