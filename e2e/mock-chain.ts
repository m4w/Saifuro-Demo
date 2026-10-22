import type { Page, Route } from "@playwright/test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  erc20Abi,
  parseUnits,
  toHex,
  type Hex,
} from "viem";
import { SETTLEMENTS } from "../src/config/settlements";
import { USDC_ADDRESS } from "../src/lib/chain/usdc";

/**
 * Answers the app's JSON-RPC calls to Base Sepolia, so tests exercise the real
 * viem code without depending on the public RPC.
 */
export interface ChainMock {
  /** "recorded": mined and successful. "pending": not mined yet. */
  state: "recorded" | "pending" | "reverted" | "down";
  /** Whether the payment's block is final yet. */
  finalized?: boolean;
  /** Overrides the amount the transfer log reports, in USDC. */
  sentAmount?: string;
}

const RPC_URL = "https://sepolia.base.org/**";
const PAYMENT_BLOCK = 48_712_809n;
const SENDER = "0x1111111111111111111111111111111111111111";
const ZERO_HASH: Hex = `0x${"0".repeat(64)}`;

export async function mockChain(page: Page, mock: ChainMock) {
  await page.unroute(RPC_URL);
  await page.route(RPC_URL, (route) => respond(route, mock));
}

async function respond(route: Route, mock: ChainMock) {
  if (mock.state === "down")
    return route.fulfill({ status: 503, body: "Service unavailable" });

  const body = route.request().postDataJSON();
  const calls: { id: number; method: string; params: unknown[] }[] =
    Array.isArray(body) ? body : [body];
  const results = calls.map((call) => ({
    jsonrpc: "2.0",
    id: call.id,
    result: answer(call.method, call.params, mock),
  }));
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(Array.isArray(body) ? results : results[0]),
  });
}

function answer(method: string, params: unknown[], mock: ChainMock): unknown {
  const latest = PAYMENT_BLOCK + 5_000n;
  switch (method) {
    case "eth_chainId":
      return toHex(84532);
    case "eth_blockNumber":
      return toHex(latest);
    case "eth_getBlockByNumber": {
      const tag = params[0];
      const number =
        tag === "finalized"
          ? mock.finalized === false
            ? PAYMENT_BLOCK - 10n
            : latest - 100n
          : BigInt(tag as string);
      return block(number);
    }
    case "eth_getTransactionReceipt":
      return mock.state === "pending" ? null : receipt(params[0] as Hex, mock);
    default:
      throw new Error(`mock-chain: unexpected RPC method ${method}`);
  }
}

function receipt(hash: Hex, mock: ChainMock) {
  const settlement = SETTLEMENTS.find(
    (s) => s.txHash.toLowerCase() === hash.toLowerCase(),
  );
  if (!settlement) return null;
  const amount = parseUnits(mock.sentAmount ?? settlement.amount, 6);
  const logs =
    mock.state === "reverted"
      ? []
      : [
          {
            address: USDC_ADDRESS,
            topics: encodeEventTopics({
              abi: erc20Abi,
              eventName: "Transfer",
              args: { from: SENDER, to: settlement.payee.address },
            }),
            data: encodeAbiParameters([{ type: "uint256" }], [amount]),
            blockNumber: toHex(PAYMENT_BLOCK),
            blockHash: ZERO_HASH,
            transactionHash: hash,
            transactionIndex: "0x0",
            logIndex: "0x0",
            removed: false,
          },
        ];
  return {
    transactionHash: hash,
    transactionIndex: "0x0",
    blockHash: ZERO_HASH,
    blockNumber: toHex(PAYMENT_BLOCK),
    from: SENDER,
    to: USDC_ADDRESS,
    cumulativeGasUsed: "0x5208",
    gasUsed: "0x5208",
    effectiveGasPrice: "0x1",
    contractAddress: null,
    logs,
    logsBloom: `0x${"0".repeat(512)}`,
    status: mock.state === "reverted" ? "0x0" : "0x1",
    type: "0x2",
  };
}

function block(number: bigint) {
  return {
    number: toHex(number),
    hash: ZERO_HASH,
    parentHash: ZERO_HASH,
    timestamp: toHex(Math.floor(Date.parse(SETTLEMENTS[1]!.sentAt) / 1000)),
    nonce: "0x0000000000000000",
    sha3Uncles: ZERO_HASH,
    logsBloom: `0x${"0".repeat(512)}`,
    transactionsRoot: ZERO_HASH,
    stateRoot: ZERO_HASH,
    receiptsRoot: ZERO_HASH,
    miner: SENDER,
    difficulty: "0x0",
    totalDifficulty: "0x0",
    extraData: "0x",
    size: "0x1",
    gasLimit: "0x1",
    gasUsed: "0x1",
    baseFeePerGas: "0x1",
    transactions: [],
    uncles: [],
  };
}
