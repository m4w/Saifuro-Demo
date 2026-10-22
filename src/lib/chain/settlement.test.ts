import {
  encodeAbiParameters,
  encodeEventTopics,
  erc20Abi,
  TransactionReceiptNotFoundError,
  type Address,
  type Hash,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  checkTransfer,
  readReceipt,
  toOnchainStatus,
  type ReceiptRead,
} from "./settlement";
import { USDC_ADDRESS } from "./usdc";

const hash: Hash = `0x${"ab".repeat(32)}`;
const payer: Address = "0x1111111111111111111111111111111111111111";
const payee: Address = "0x2222222222222222222222222222222222222222";
const otherToken: Address = "0x3333333333333333333333333333333333333333";

function transferLog(token: Address, to: Address, value: bigint) {
  return {
    address: token,
    topics: encodeEventTopics({
      abi: erc20Abi,
      eventName: "Transfer",
      args: { from: payer, to },
    }),
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
    blockNumber: 100n,
    transactionHash: hash,
    logIndex: 0,
    blockHash: hash,
    transactionIndex: 0,
    removed: false,
  };
}

function fakeClient(receipt: object | Error) {
  return {
    getTransactionReceipt: vi.fn(async () => {
      if (receipt instanceof Error) throw receipt;
      return receipt;
    }),
    getBlock: vi.fn(async () => ({ timestamp: 1_792_000_000n, number: 100n })),
    getBlockNumber: vi.fn(async () => 120n),
  } as unknown as Parameters<typeof readReceipt>[0];
}

describe("readReceipt", () => {
  it("returns not_found when the network hasn't recorded the transaction", async () => {
    const client = fakeClient(new TransactionReceiptNotFoundError({ hash }));
    await expect(readReceipt(client, hash)).resolves.toEqual({
      state: "not_found",
    });
  });

  it("rethrows RPC failures so the UI can show them as unavailable", async () => {
    const client = fakeClient(new Error("fetch failed"));
    await expect(readReceipt(client, hash)).rejects.toThrow("fetch failed");
  });

  it("reads only USDC transfers from the logs", async () => {
    const client = fakeClient({
      status: "success",
      blockNumber: 100n,
      logs: [
        transferLog(otherToken, payee, 1n),
        transferLog(USDC_ADDRESS, payee, 7_250_000n),
      ],
    });
    await expect(readReceipt(client, hash)).resolves.toEqual({
      state: "success",
      blockNumber: 100n,
      recordedAt: new Date(1_792_000_000_000).toISOString(),
      transfers: [{ from: payer, to: payee, amount: 7_250_000n }],
    });
  });

  it("reports reverted transactions", async () => {
    const client = fakeClient({
      status: "reverted",
      blockNumber: 100n,
      logs: [],
    });
    await expect(readReceipt(client, hash)).resolves.toMatchObject({
      state: "reverted",
      blockNumber: 100n,
    });
  });
});

describe("toOnchainStatus", () => {
  const success: ReceiptRead = {
    state: "success",
    blockNumber: 100n,
    recordedAt: "2026-10-22T10:00:00Z",
    transfers: [],
  };

  it("is loading until the receipt is read", () => {
    expect(toOnchainStatus({ isError: false }, undefined)).toEqual({
      state: "loading",
    });
  });

  it("is unavailable when the RPC fails", () => {
    expect(toOnchainStatus({ isError: true }, undefined)).toEqual({
      state: "unavailable",
    });
  });

  it("counts confirmations including the payment's own block", () => {
    expect(
      toOnchainStatus(
        { data: success, isError: false },
        { latest: 100n, finalized: 90n },
      ),
    ).toMatchObject({
      state: "recorded",
      confirmations: 1n,
      finalized: false,
    });
    expect(
      toOnchainStatus(
        { data: success, isError: false },
        { latest: 5800n, finalized: 100n },
      ),
    ).toMatchObject({
      confirmations: 5701n,
      finalized: true,
    });
  });

  it("keeps the recorded data when only the chain head is missing", () => {
    expect(
      toOnchainStatus({ data: success, isError: false }, undefined),
    ).toMatchObject({
      state: "recorded",
      confirmations: null,
      finalized: null,
    });
  });
});

describe("checkTransfer", () => {
  const payment = {
    amount: "7250000",
    payee: { id: "p", name: "Lumen", address: payee },
  };

  it("matches the approved amount and payee, ignoring address case", () => {
    const transfer = {
      from: payer,
      to: payee.toUpperCase().replace("0X", "0x") as Address,
      amount: 7_250_000n,
    };
    expect(checkTransfer([transfer], payment)).toEqual({
      state: "match",
      transfer,
    });
  });

  it("flags a different amount", () => {
    expect(
      checkTransfer([{ from: payer, to: payee, amount: 1n }], payment).state,
    ).toBe("wrong_amount");
  });

  it("flags a different recipient", () => {
    expect(
      checkTransfer(
        [{ from: payer, to: otherToken, amount: 7_250_000n }],
        payment,
      ).state,
    ).toBe("wrong_recipient");
  });

  it("flags a transaction without a USDC transfer", () => {
    expect(checkTransfer([], payment)).toEqual({ state: "missing" });
  });
});
