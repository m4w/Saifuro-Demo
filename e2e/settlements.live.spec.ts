import { expect, test } from "@playwright/test";
import { SETTLEMENTS } from "../src/config/settlements";

// Opt-in (npm run test:live): reads the configured transfers from the real Base Sepolia RPC.
for (const [i, s] of SETTLEMENTS.entries()) {
  test(`${s.story}: ${s.txHash.slice(0, 10)}… is recorded and matches the config`, async ({
    page,
  }) => {
    await page.goto(`/payments/pay_S${i + 1}`);
    await expect(page.getByText("Recorded on Base.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText("Matches the approved amount.", { exact: false }),
    ).toBeVisible();
  });
}
