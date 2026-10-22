import {
  erc20Abi,
  isAddressEqual,
  parseEventLogs,
  TransactionReceiptNotFoundError,
  type Address,
  type Hash,
  type PublicClient,
  type Transport,
} from "viem";
import type { IsoDate, Payment } from "@/lib/api/types";
import { USDC_ADDRESS, type chain } from "./usdc";

export interface Transfer {
  from: Address;
  to: Address;
  amount: bigint;
}

/** What the transaction receipt says. Once a payment is recorded, this never changes. */
export type ReceiptRead =
  | { state: "not_found" }
  | { state: "reverted"; blockNumber: bigint; recordedAt: IsoDate }
  | {
      state: "success";
      blockNumber: bigint;
      recordedAt: IsoDate;
      transfers: Transfer[];
    };

/** The newest block and the newest final block. Changes every ~2 seconds. */
export interface ChainHead {
  latest: bigint;
  finalized: bigint;
}

/** Everything the UI needs to show the onchain part of a payment. */
export type OnchainStatus =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "not_found" }
  | { state: "reverted"; blockNumber: bigint; recordedAt: IsoDate }
  | {
      state: "recorded";
      blockNumber: bigint;
      recordedAt: IsoDate;
      transfers: Transfer[];
      /** null while the chain head is unknown. */
      confirmations: bigint | null;
      finalized: boolean | null;
    };

type ReadClient = Pick<
  PublicClient<Transport, typeof chain>,
  "getTransactionReceipt" | "getBlock" | "getBlockNumber"
>;

export async function readReceipt(
  client: ReadClient,
  hash: Hash,
): Promise<ReceiptRead> {
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash });
  } catch (error) {
    if (error instanceof TransactionReceiptNotFoundError)
      return { state: "not_found" };
    throw error;
  }

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  const recordedAt = new Date(Number(block.timestamp) * 1000).toISOString();
  if (receipt.status === "reverted")
    return { state: "reverted", blockNumber: receipt.blockNumber, recordedAt };

  const transfers = parseEventLogs({
    abi: erc20Abi,
    eventName: "Transfer",
    logs: receipt.logs,
  })
    .filter((log) => isAddressEqual(log.address, USDC_ADDRESS))
    .map((log) => ({
      from: log.args.from,
      to: log.args.to,
      amount: log.args.value,
    }));

  return {
    state: "success",
    blockNumber: receipt.blockNumber,
    recordedAt,
    transfers,
  };
}

export async function readChainHead(client: ReadClient): Promise<ChainHead> {
  const [latest, finalized] = await Promise.all([
    client.getBlockNumber({ cacheTime: 0 }),
    client.getBlock({ blockTag: "finalized" }),
  ]);
  return { latest, finalized: finalized.number };
}

export function toOnchainStatus(
  receipt: { data?: ReceiptRead; isError: boolean },
  head: ChainHead | undefined,
): OnchainStatus {
  if (receipt.isError && !receipt.data) return { state: "unavailable" };
  if (!receipt.data) return { state: "loading" };
  if (receipt.data.state !== "success") return receipt.data;

  const { blockNumber, recordedAt, transfers } = receipt.data;
  return {
    state: "recorded",
    blockNumber,
    recordedAt,
    transfers,
    confirmations: head ? head.latest - blockNumber + 1n : null,
    finalized: head ? head.finalized >= blockNumber : null,
  };
}

export type TransferCheck =
  | { state: "match"; transfer: Transfer }
  | { state: "wrong_amount"; transfer: Transfer }
  | { state: "wrong_recipient"; transfer: Transfer }
  | { state: "missing" };

/** Compares what actually moved onchain with what was approved. */
export function checkTransfer(
  transfers: Transfer[],
  payment: Pick<Payment, "amount" | "payee">,
): TransferCheck {
  const toPayee = transfers.filter((t) =>
    isAddressEqual(t.to, payment.payee.address),
  );
  const exact = toPayee.find((t) => t.amount === BigInt(payment.amount));
  if (exact) return { state: "match", transfer: exact };
  if (toPayee[0]) return { state: "wrong_amount", transfer: toPayee[0] };
  if (transfers[0]) return { state: "wrong_recipient", transfer: transfers[0] };
  return { state: "missing" };
}
