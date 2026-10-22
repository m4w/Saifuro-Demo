import { expect, test } from "@playwright/test";
import { tabTo } from "./keyboard";
import { mockChain } from "./mock-chain";

test.beforeEach(async ({ page }) => {
  await mockChain(page, { state: "recorded" });
});

test("the home page opens the approval queue", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/approvals$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Approval queue" }),
  ).toBeVisible();
});

test("reviews and rejects a payment using only the keyboard", async ({
  page,
}) => {
  await page.goto("/approvals");
  await expect(page.getByText("9 payments waiting for approval")).toBeVisible();

  // The skip link is the first stop.
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();

  // Filter
  await tabTo(page, page.getByRole("searchbox", { name: "Search" }));
  await page.keyboard.type("northwind");
  await expect(
    page.getByText("Showing 2 of 9 payments waiting for approval"),
  ).toBeVisible();
  await expect(page).toHaveURL(/q=northwind/);

  // Sort by amount, largest first
  await tabTo(page, page.getByRole("button", { name: "Amount" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("columnheader", { name: "Amount" }),
  ).toHaveAttribute("aria-sort", "descending");
  const firstReview = page.getByRole("link", { name: /^Review:/ }).first();
  await expect(firstReview).toHaveAccessibleName(
    "Review: 620.00 USDC to Northwind Office Supply",
  );

  // Open it; focus moves to the new page's heading
  await tabTo(page, firstReview);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "620.00 USDC to Northwind Office Supply",
    }),
  ).toBeFocused();
  await expect(
    page.getByText(
      "Exceeds the 500.00 USDC per-transaction limit for Procurement Agent by 120.00 USDC.",
    ),
  ).toBeVisible();

  // Reject without a reason: focus goes back to the field
  await tabTo(page, page.getByRole("button", { name: "Reject payment" }));
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Reject this payment?" });
  const reason = dialog.getByRole("textbox", { name: "Reason for rejecting" });
  await expect(reason).toBeFocused();
  await tabTo(page, dialog.getByRole("button", { name: "Reject payment" }));
  await page.keyboard.press("Enter");
  await expect(reason).toBeFocused();
  await expect(reason).toHaveAttribute("aria-invalid", "true");

  // Reject with a reason: the confirmation takes focus
  await page.keyboard.type("Ordered twice by mistake.");
  await tabTo(page, dialog.getByRole("button", { name: "Reject payment" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Payment rejected" }),
  ).toBeFocused();
  await expect(
    page.getByText("Rejected by Jordan Lee", { exact: true }),
  ).toBeVisible();

  // Back to the queue, with the filter still applied
  await tabTo(
    page,
    page.getByRole("link", { name: "Back to approval queue" }),
    { backwards: true },
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Showing 1 of 8 payments waiting for approval"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Approval queue" }),
  ).toBeFocused();
});

test("an approved payment moves to history and isn't sent in the demo", async ({
  page,
}) => {
  await page.goto("/payments/pay_6TR3");
  await page.getByRole("button", { name: "Approve payment" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve 350.00 USDC" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Payment approved" }),
  ).toBeVisible();

  const sent = page.getByRole("listitem").filter({ hasText: "Sent on Base" });
  await expect(sent).toContainText("Not started");
  await expect(sent).toContainText(
    "This demo doesn't send payments, so it ends here.",
  );
  await expect(
    page.getByRole("link", { name: /Approval queue/ }),
  ).toContainText("8");

  await page.getByRole("link", { name: "Payment history" }).click();
  const row = page.getByRole("row").filter({ hasText: "Helix Design Studio" });
  await expect(row).toContainText("Approved");

  // Decisions survive a reload.
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "Helix Design Studio" }),
  ).toContainText("Approved");
});

test("filters live in the URL and can be cleared", async ({ page }) => {
  await page.goto("/approvals?rule=velocity_limit");
  await expect(
    page.getByRole("combobox", { name: "Rule triggered" }),
  ).toHaveValue("velocity_limit");
  await expect(
    page.getByText("Showing 1 of 9 payments waiting for approval"),
  ).toBeVisible();

  await page
    .getByRole("searchbox", { name: "Search" })
    .fill("nothing matches this");
  await expect(page.getByText("No payments match your filters")).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(page.getByText("9 payments waiting for approval")).toBeVisible();
  await expect(page).toHaveURL(/\/approvals$/);
});

test("the agent filter stays visible after its last payment leaves the queue", async ({
  page,
}) => {
  await page.goto("/approvals?agent=agent_credits");
  await expect(
    page.getByText("Showing 1 of 9 payments waiting for approval"),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Review: 12.00 USDC to Vector Search API" })
    .click();
  await page.getByRole("button", { name: "Approve payment" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve 12.00 USDC" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Payment approved" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to approval queue" }).click();
  await expect(
    page.getByText("Showing 0 of 8 payments waiting for approval"),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Agent" })).toHaveValue(
    "agent_credits",
  );
});

test("demo controls simulate a service outage, with a way back", async ({
  page,
}) => {
  await page.goto("/approvals");
  await expect(page.getByText("9 payments waiting for approval")).toBeVisible();

  await page.getByRole("button", { name: "Demo controls" }).click();
  await page.getByRole("checkbox", { name: /Payments service outage/ }).check();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Couldn't load the approval queue" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demo scenario on: Payments service outage"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByText("9 payments waiting for approval")).toBeVisible();
});

test("unknown payments get a clear not-found state", async ({ page }) => {
  await page.goto("/payments/pay_nope");
  await expect(
    page.getByRole("heading", { level: 1, name: "Payment not found" }),
  ).toBeVisible();
});
