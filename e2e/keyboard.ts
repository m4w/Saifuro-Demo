import { expect, type Locator, type Page } from "@playwright/test";

/** Presses Tab (or Shift+Tab) until `target` has focus. Fails if it's not reachable by keyboard. */
export async function tabTo(
  page: Page,
  target: Locator,
  { backwards = false, max = 40 } = {},
) {
  for (let i = 0; i < max; i++) {
    if (
      await target
        .evaluate((el) => el === document.activeElement)
        .catch(() => false)
    )
      return;
    await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
  }
  await expect(
    target,
    `not reachable with ${backwards ? "Shift+Tab" : "Tab"}`,
  ).toBeFocused();
}
