import type { Hash } from "viem";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { OnchainStatus } from "@/lib/chain/settlement";
import { usdc } from "@/lib/format/amount";
import { OnchainDetails } from "./onchain-details";

const hash: Hash = `0x${"ab".repeat(32)}`;
const payee = "0x2222222222222222222222222222222222222222";
const payment = {
  amount: usdc("7.25"),
  payee: { id: "lumen", name: "Lumen Inference", address: payee },
} as const;

function recorded(
  amount: bigint,
  extra: Partial<Extract<OnchainStatus, { state: "recorded" }>> = {},
): OnchainStatus {
  return {
    state: "recorded",
    blockNumber: 48_712_809n,
    recordedAt: "2026-10-22T10:20:30Z",
    transfers: [
      { from: "0x1111111111111111111111111111111111111111", to: payee, amount },
    ],
    confirmations: 12_246n,
    finalized: true,
    ...extra,
  };
}

function show(status: OnchainStatus, onRetry = () => {}) {
  return render(
    <OnchainDetails
      status={status}
      payment={payment}
      hash={hash}
      retrying={false}
      onRetry={onRetry}
    />,
  );
}

describe("OnchainDetails", () => {
  it("confirms the amount that arrived and explains the technical values", async () => {
    const screen = await show(recorded(7_250_000n));
    await expect
      .element(
        screen.getByText("Matches the approved amount.", { exact: false }),
      )
      .toBeVisible();
    await expect.element(screen.getByText("48,712,809")).toBeVisible();
    await expect.element(screen.getByText("12,246")).toBeVisible();
    await expect
      .element(screen.getByText("Blocks added since.", { exact: false }))
      .toBeVisible();
    const link = screen.getByRole("link", { name: /View on Basescan/ });
    await expect
      .element(link)
      .toHaveAttribute("href", `https://sepolia.basescan.org/tx/${hash}`);
    await expect
      .element(link)
      .toHaveAccessibleName("View on Basescan (opens in a new tab)");
  });

  it("warns when a different amount arrived", async () => {
    const screen = await show(recorded(3_000_000n));
    await expect
      .element(
        screen.getByText(
          "3.00 USDC was sent to Lumen Inference, but 7.25 USDC was approved.",
          { exact: false },
        ),
      )
      .toBeVisible();
  });

  it("offers a retry when the network can't be reached", async () => {
    const onRetry = vi.fn();
    const screen = await show({ state: "unavailable" }, onRetry);
    await expect
      .element(
        screen.getByRole("alert").getByText("Couldn't reach the Base network"),
      )
      .toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("says it keeps checking while the network hasn't recorded the transfer", async () => {
    const screen = await show({ state: "not_found" });
    await expect
      .element(
        screen.getByText("This page checks again every few seconds.", {
          exact: false,
        }),
      )
      .toBeVisible();
  });

  it("shows that confirmations are still loading", async () => {
    const screen = await show(
      recorded(7_250_000n, { confirmations: null, finalized: null }),
    );
    await expect.element(screen.getByText("Checking…")).toBeVisible();
  });
});
