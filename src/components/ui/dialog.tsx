"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/**
 * A modal built on the native <dialog>: the browser traps focus, makes the page
 * behind it inert and closes it on Escape. We add focus return and the labels.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusTo.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // On unmount, and when Next.js hides the page after navigating away: close
  // the dialog so it isn't open on return, and give focus back.
  useLayoutEffect(() => {
    const dialog = ref.current;
    const returnTo = returnFocusTo;
    return () => {
      if (!dialog?.open) return;
      dialog.close();
      returnTo.current?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={(event) => {
        // The browser fires "close" a moment after closing. If the dialog has opened again since
        // (React re-runs effects in development), this event is stale.
        if (event.currentTarget.open) return;
        onClose();
        returnFocusTo.current?.focus();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-text shadow-2xl"
    >
      {open && (
        <div className="p-5">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-1 text-sm text-text-muted">
              {description}
            </div>
          )}
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
