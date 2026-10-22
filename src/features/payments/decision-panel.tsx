"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, inputStyles } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { useDecidePayment } from "@/lib/api/queries";
import {
  getPaymentStatus,
  type Agent,
  type Payment,
  type Review,
} from "@/lib/api/types";
import { formatUsdc } from "@/lib/format/amount";
import { formatDateTime } from "@/lib/format/time";

type Decision = Review["decision"];

/**
 * Moves focus to the confirmation as soon as it appears, so screen readers
 * announce it and keyboard users continue from there. A ref, not an effect:
 * the confirmation can mount a render after the decision is saved.
 */
const focusOnMount = (el: HTMLElement | null) => el?.focus();

export function DecisionPanel({
  payment,
  agent,
}: {
  payment: Payment;
  agent: Agent;
}) {
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [justDecided, setJustDecided] = useState<Decision | null>(null);
  const mutation = useDecidePayment(payment.id);

  useLayoutEffect(() => () => setJustDecided(null), []);

  const status = getPaymentStatus(payment);
  const { review } = payment;

  if (status === "needs_approval") {
    return (
      <Panel title="Your decision">
        <p className="text-sm text-text-muted">
          Approving lets {agent.name} send {formatUsdc(payment.amount)} to{" "}
          {payment.payee.name}. Rejecting cancels the payment, and your note is
          saved with it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setDialog("approved")}>
            Approve payment
          </Button>
          <Button variant="secondary" onClick={() => setDialog("rejected")}>
            Reject payment
          </Button>
        </div>
        {dialog && (
          <DecisionDialog
            key={dialog}
            decision={dialog}
            payment={payment}
            agent={agent}
            pending={mutation.isPending}
            error={mutation.error}
            onClose={() => {
              setDialog(null);
              mutation.reset();
            }}
            onSubmit={(note) =>
              mutation.mutate(
                { decision: dialog, note },
                {
                  onSuccess: () => {
                    setDialog(null);
                    setJustDecided(dialog);
                  },
                },
              )
            }
          />
        )}
      </Panel>
    );
  }

  if (!review) return null;

  return (
    <Panel title="Decision">
      {justDecided && (
        <Alert
          ref={focusOnMount}
          focusable
          role="status"
          tone="success"
          className="mb-4"
          title={
            justDecided === "approved" ? "Payment approved" : "Payment rejected"
          }
        >
          {justDecided === "approved"
            ? "It's now waiting to be sent. In this demo, approvals aren't sent onchain."
            : "The payment is cancelled and your note is saved with it."}
        </Alert>
      )}
      <p>
        {review.decision === "approved" ? "Approved" : "Rejected"} by{" "}
        {review.reviewer}
      </p>
      <p className="text-sm text-text-muted">
        <time dateTime={review.at}>{formatDateTime(review.at)}</time>
      </p>
      {review.note && (
        <blockquote className="mt-3 border-l-2 border-border-strong pl-3 text-sm">
          <span className="sr-only">Note: </span>
          {review.note}
        </blockquote>
      )}
    </Panel>
  );
}

interface DecisionDialogProps {
  decision: Decision;
  payment: Payment;
  agent: Agent;
  pending: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
}

function DecisionDialog({
  decision,
  payment,
  agent,
  pending,
  error,
  onClose,
  onSubmit,
}: DecisionDialogProps) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string>();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const approving = decision === "approved";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!approving && !note.trim()) {
      setNoteError("Add a note explaining why the payment is rejected.");
      noteRef.current?.focus();
      return;
    }
    onSubmit(note);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={approving ? "Approve this payment?" : "Reject this payment?"}
      description={`${formatUsdc(payment.amount)} to ${payment.payee.name}, requested by ${agent.name}.`}
    >
      <form onSubmit={submit} noValidate>
        <Field
          label={approving ? "Note (optional)" : "Reason for rejecting"}
          hint={
            approving
              ? "Saved with the payment for the audit trail."
              : "Required. Saved with the payment and shared with the team."
          }
          error={noteError}
        >
          {(props) => (
            <textarea
              {...props}
              ref={noteRef}
              rows={3}
              value={note}
              required={!approving}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError(undefined);
              }}
              className={inputStyles}
            />
          )}
        </Field>

        {error && (
          <Alert
            tone="danger"
            role="alert"
            className="mt-4"
            title="The decision wasn't saved"
          >
            {error.message}
          </Alert>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={approving ? "primary" : "danger"}
            disabled={pending}
          >
            {pending
              ? approving
                ? "Approving…"
                : "Rejecting…"
              : approving
                ? `Approve ${formatUsdc(payment.amount)}`
                : "Reject payment"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
