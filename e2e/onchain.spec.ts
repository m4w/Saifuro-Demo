import { expect, test, type Page } from "@playwright/test";
import { SETTLEMENTS } from "../src/config/settlements";
import { mockChain } from "./mock-chain";

// The seed gives paid-out payments the IDs pay_S1, pay_S2, … in config order.
const index = SETTLEMENTS.findIndex((s) => s.story === "over_limit");
const settlement = SETTLEMENTS[index]!;
const path = `/payments/pay_S${index + 1}`;

const step = (page: Page, label: string) =>
  page.getByRole("listitem").filter({ hasText: label });

test("a final payment shows what arrived, in plain language", async ({
  page,
}) => {
  await mockChain(page, { state: "recorded", finalized: true });
  await page.goto(path);

  await expect(step(page, "Sent on Base")).toContainText("Recorded on Base.");
  await expect(
    page.getByText("Matches the approved amount.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("48,712,809")).toBeVisible();
  await expect(step(page, "Confirmed")).toContainText(
    "Final. This payment can no longer be reversed.",
  );
  await expect(
    page.getByRole("link", { name: /View on Basescan/ }).first(),
  ).toHaveAttribute(
    "href",
    `https://sepolia.basescan.org/tx/${settlement.txHash}`,
  );
});

test("a recorded payment that isn't final yet says how long that takes", async ({
  page,
}) => {
  await mockChain(page, { state: "recorded", finalized: false });
  await page.goto(path);
  await expect(step(page, "Confirmed")).toContainText(
    "Recorded, becoming final. This usually takes about 20 minutes.",
  );
  await expect(step(page, "Confirmed")).toHaveAttribute("aria-current", "step");
});

test("a transfer the network hasn't recorded yet keeps being checked", async ({
  page,
}) => {
  await mockChain(page, { state: "pending" });
  await page.goto(path);
  await expect(step(page, "Sent on Base")).toContainText(
    "Sent. Waiting for the network to record it.",
  );

  // Once the network records it, the page picks it up without a reload.
  await mockChain(page, { state: "recorded", finalized: true });
  await expect(step(page, "Sent on Base")).toContainText("Recorded on Base.", {
    timeout: 10_000,
  });
});

test("a reverted transfer says no money moved", async ({ page }) => {
  await mockChain(page, { state: "reverted" });
  await page.goto(path);
  await expect(step(page, "Sent on Base")).toContainText(
    "The network rejected this transfer. No money moved.",
  );
  await expect(step(page, "Confirmed")).toContainText(
    "Not confirmed: the transfer failed.",
  );
});

test("a different amount onchain is flagged", async ({ page }) => {
  await mockChain(page, { state: "recorded", sentAmount: "1" });
  await page.goto(path);
  await expect(
    page.getByText("Doesn't match the approval.", { exact: false }),
  ).toBeVisible();
});

test("an RPC failure is explained and can be retried", async ({ page }) => {
  await mockChain(page, { state: "down" });
  await page.goto(path);
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Couldn't reach the Base network" });
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await expect(step(page, "Sent on Base")).toContainText("Unknown");

  await mockChain(page, { state: "recorded", finalized: true });
  await alert.getByRole("button", { name: "Check again" }).click();
  await expect(step(page, "Sent on Base")).toContainText("Recorded on Base.");
});

for (const [toggle, shows] of [
  [
    "Base network unreachable",
    "Couldn't reach the Base network to check this payment.",
  ],
  ["Transfers not recorded yet", "Sent. Waiting for the network to record it."],
] as const) {
  test(`demo controls link to a payment that shows "${toggle}"`, async ({
    page,
  }) => {
    // The mocked chain says "final", so only the simulation can produce the message.
    await mockChain(page, { state: "recorded", finalized: true });
    await page.goto("/approvals");

    await page.getByRole("button", { name: "Demo controls" }).click();
    const dialog = page.getByRole("dialog", { name: "Demo controls" });
    await dialog.getByRole("checkbox", { name: new RegExp(toggle) }).check();
    await dialog.getByRole("link", { name: "See an example" }).first().click();

    await expect(dialog).toBeHidden();
    await expect(step(page, "Sent on Base")).toContainText(shows, {
      timeout: 10_000,
    });
  });
}
