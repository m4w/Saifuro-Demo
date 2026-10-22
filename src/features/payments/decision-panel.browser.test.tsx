import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { api, paymentQuery } from "@/lib/api/queries";
import { DecisionPanel } from "./decision-panel";

// Uses the real mock API, the way the page does.
function Harness({ id }: { id: string }) {
  const { data } = useQuery(paymentQuery(id));
  return data ? (
    <DecisionPanel payment={data.payment} agent={data.agent} />
  ) : (
    <p>Loading</p>
  );
}

function renderPanel(id = "pay_4KQ7") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Harness id={id} />
    </QueryClientProvider>,
  );
}

beforeEach(() => api.reset());

describe("DecisionPanel", () => {
  it("requires a reason to reject, and points the user to the field", async () => {
    const screen = await renderPanel();
    await userEvent.click(
      screen.getByRole("button", { name: "Reject payment" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Reject this payment?" });
    await expect
      .element(dialog)
      .toHaveAccessibleDescription(
        "620.00 USDC to Northwind Office Supply, requested by Procurement Agent.",
      );
    await userEvent.click(
      dialog.getByRole("button", { name: "Reject payment" }),
    );

    const reason = dialog.getByRole("textbox", {
      name: "Reason for rejecting",
    });
    await expect.element(reason).toHaveFocus();
    await expect.element(reason).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(reason)
      .toHaveAccessibleDescription(
        /Add a note explaining why the payment is rejected\./,
      );
  });

  it("approves, then confirms the decision and moves focus to the confirmation", async () => {
    const screen = await renderPanel();
    await userEvent.click(
      screen.getByRole("button", { name: "Approve payment" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Approve this payment?",
    });
    await userEvent.fill(
      dialog.getByRole("textbox", { name: "Note (optional)" }),
      "Budgeted for Q4",
    );
    await userEvent.click(
      dialog.getByRole("button", { name: "Approve 620.00 USDC" }),
    );

    const confirmation = screen.getByRole("status");
    await expect
      .element(confirmation.getByText("Payment approved"))
      .toBeVisible();
    await expect.element(confirmation).toHaveFocus();
    await expect
      .element(screen.getByText("Approved by Jordan Lee"))
      .toBeVisible();
    await expect
      .element(screen.getByText("Budgeted for Q4", { exact: false }))
      .toBeVisible();
  });

  it("cancelling keeps the payment pending and returns focus", async () => {
    const screen = await renderPanel();
    const reject = screen.getByRole("button", { name: "Reject payment" });
    await userEvent.click(reject);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(reject).toHaveFocus();
  });
});
