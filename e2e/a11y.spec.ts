import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockChain } from "./mock-chain";

// Each page, and text that shows it finished loading.
const pages: [string, string][] = [
  ["/approvals", "9 payments waiting for approval"],
  ["/payments", "Outcome"],
  ["/payments/pay_4KQ7", "Your decision"],
  ["/payments/pay_S2", "Technical details"],
];

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
}

test.beforeEach(async ({ page }) => {
  await mockChain(page, { state: "recorded", finalized: true });
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const [path, ready] of pages) {
    test(`${path} has no WCAG A/AA violations in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });
  }
}

test("the decision dialog has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/payments/pay_4KQ7");
  await page.getByRole("button", { name: "Reject payment" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reject payment" })
    .click();
  await expect(
    page.getByText("Add a note explaining why the payment is rejected."),
  ).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});

test("the in-progress pulse stops when the user prefers reduced motion", async ({
  page,
}) => {
  const animation = () =>
    page.evaluate(() => {
      const marker = document.querySelector(
        'li[aria-current="step"] > span:nth-of-type(2)',
      );
      return marker ? getComputedStyle(marker).animationName : "missing";
    });

  await page.goto("/payments/pay_4KQ7");
  await expect(page.getByText("Waiting for a reviewer.")).toBeVisible();
  expect(await animation()).toBe("pulse-ring");

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await animation()).toBe("none");
});

test("pages don't scroll sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, ready] of pages) {
    await page.goto(path);
    await expect(page.getByText(ready).first()).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("the chosen theme is applied before the page renders, after a reload", async ({
  page,
}) => {
  await page.goto("/approvals");
  // The radio input is visually hidden; users click its label.
  await page.locator("label").filter({ hasText: "Dark" }).click();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload({ waitUntil: "domcontentloaded" });
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
  ).toBe("dark");
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
});
