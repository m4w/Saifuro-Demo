import { StrictMode, useState } from "react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { Dialog } from "./dialog";

function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Settings"
        description="Change how things work."
      >
        <label>
          Name <input />
        </label>
        <button onClick={() => setOpen(false)}>Done</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens as a labelled modal with focus inside", async () => {
    const screen = await render(<Example />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open settings" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(dialog)
      .toHaveAccessibleDescription("Change how things work.");
    await expect
      .element(screen.getByRole("textbox", { name: "Name" }))
      .toHaveFocus();
  });

  it("closes on Escape and gives focus back to the button that opened it", async () => {
    const screen = await render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await userEvent.click(trigger);
    await expect.element(screen.getByRole("dialog")).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it("gives focus back when closed from inside", async () => {
    const screen = await render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await expect.element(trigger).toHaveFocus();
  });

  it("stays open when it mounts open in Strict Mode, as in development", async () => {
    function OpensOnMount() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open settings</button>
          {open && (
            <Dialog open onClose={() => setOpen(false)} title="Settings">
              <button onClick={() => setOpen(false)}>Done</button>
            </Dialog>
          )}
        </>
      );
    }
    const screen = await render(
      <StrictMode>
        <OpensOnMount />
      </StrictMode>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Open settings" }),
    );
    // The browser fires "close" a task after dialog.close(); give it time to arrive.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect
      .element(screen.getByRole("dialog", { name: "Settings" }))
      .toBeVisible();
  });
});
