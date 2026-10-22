import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { Timeline, TimelineItem } from "./timeline";

describe("Timeline", () => {
  it("is an ordered list whose step states are readable as text", async () => {
    const screen = await render(
      <Timeline label="Payment progress">
        <TimelineItem state="complete" title="Requested" />
        <TimelineItem state="current" title="Human approval">
          Waiting for a reviewer.
        </TimelineItem>
        <TimelineItem state="upcoming" title="Sent on Base" />
        <TimelineItem state="unknown" title="Confirmed" />
      </Timeline>,
    );

    const list = screen.getByRole("list", { name: "Payment progress" });
    await expect.element(list).toBeVisible();
    const items = screen.getByRole("listitem").elements();
    expect(items.map((li) => li.textContent)).toEqual([
      "Requested: Done.",
      "Human approval: In progress.Waiting for a reviewer.",
      "Sent on Base: Not started.",
      "Confirmed: Unknown.",
    ]);
  });

  it("marks only the current step with aria-current", async () => {
    const screen = await render(
      <Timeline label="Steps">
        <TimelineItem state="complete" title="One" />
        <TimelineItem state="current" title="Two" />
        <TimelineItem state="upcoming" title="Three" />
      </Timeline>,
    );
    const current = screen
      .getByRole("listitem")
      .elements()
      .filter((li) => li.getAttribute("aria-current") === "step");
    expect(current.map((li) => li.textContent)).toEqual(["Two: In progress."]);
  });
});
