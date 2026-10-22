import type { ReactNode } from "react";
import type { Hash } from "viem";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertIcon,
  CheckIcon,
  ExternalIcon,
  RetryIcon,
} from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { Payment } from "@/lib/api/types";
import { checkTransfer, type OnchainStatus } from "@/lib/chain/settlement";
import { chain, explorerTxUrl } from "@/lib/chain/usdc";
import { formatUsdc } from "@/lib/format/amount";

const count = new Intl.NumberFormat("en-US");

/** Only what's needed to check the transfer against the approval. */
type ApprovedPayment = Pick<Payment, "amount" | "payee">;

interface OnchainDetailsProps {
  status: OnchainStatus;
  payment: ApprovedPayment;
  hash: Hash;
  retrying: boolean;
  onRetry: () => void;
}

/**
 * What Base Sepolia says about the payment, explained for people who don't
 * read block explorers. Technical values come with a one-line explanation.
 */
export function OnchainDetails({
  status,
  payment,
  hash,
  retrying,
  onRetry,
}: OnchainDetailsProps) {
  switch (status.state) {
    case "loading":
      return (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      );

    case "unavailable":
      return (
        <Alert
          tone="danger"
          role="alert"
          className="mt-3"
          title="Couldn't reach the Base network"
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={onRetry} disabled={retrying}>
                <RetryIcon size={14} />
                {retrying ? "Checking…" : "Check again"}
              </Button>
              <ExplorerLink hash={hash} />
            </div>
          }
        >
          The payment itself isn&apos;t affected. Only the status check failed.
        </Alert>
      );

    case "not_found":
      return (
        <div className="mt-2 space-y-2">
          <p>
            This page checks again every few seconds. Base usually records a
            transfer within seconds.
          </p>
          <ExplorerLink hash={hash} />
        </div>
      );

    case "reverted":
      return (
        <TechnicalDetails hash={hash}>
          <Detail
            label="Block"
            hint="The batch of transactions this attempt was recorded in."
          >
            {count.format(status.blockNumber)}
          </Detail>
        </TechnicalDetails>
      );

    case "recorded":
      return (
        <>
          <TransferResult status={status} payment={payment} />
          <TechnicalDetails hash={hash}>
            <Detail
              label="Block"
              hint="The batch of transactions this payment was recorded in."
            >
              {count.format(status.blockNumber)}
            </Detail>
            <Detail
              label="Confirmations"
              hint="Blocks added since. Each one makes the payment harder to reverse."
            >
              {status.confirmations === null
                ? "Checking…"
                : count.format(status.confirmations)}
            </Detail>
          </TechnicalDetails>
        </>
      );
  }
}

function TransferResult({
  status,
  payment,
}: {
  status: Extract<OnchainStatus, { state: "recorded" }>;
  payment: ApprovedPayment;
}) {
  const check = checkTransfer(status.transfers, payment);
  const approved = formatUsdc(payment.amount);

  if (check.state === "match") {
    return (
      <p className="mt-2 flex items-start gap-1.5 text-text">
        <CheckIcon className="mt-0.5 shrink-0 text-success" />
        <span>
          <span className="font-medium">
            {formatUsdc(check.transfer.amount)}
          </span>{" "}
          received by {payment.payee.name}. Matches the approved amount.
        </span>
      </p>
    );
  }

  const message =
    check.state === "wrong_amount"
      ? `${formatUsdc(check.transfer.amount)} was sent to ${payment.payee.name}, but ${approved} was approved.`
      : check.state === "wrong_recipient"
        ? `${formatUsdc(check.transfer.amount)} was sent to ${check.transfer.to}, not to ${payment.payee.name}'s address.`
        : "This transaction contains no USDC transfer.";

  return (
    <p className="mt-2 flex items-start gap-1.5 text-text">
      <AlertIcon className="mt-0.5 shrink-0 text-warning" />
      <span>
        <span className="font-medium">Doesn&apos;t match the approval.</span>{" "}
        {message}
      </span>
    </p>
  );
}

function TechnicalDetails({
  hash,
  children,
}: {
  hash: Hash;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-md border border-border bg-canvas p-3">
      <p className="text-xs font-medium text-text-muted">Technical details</p>
      <dl className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-3">
        {children}
        <Detail label="Transaction" hint="Its unique reference on the network.">
          <span className="font-mono text-xs" title={hash}>
            {hash.slice(0, 10)}…{hash.slice(-8)}
          </span>
        </Detail>
      </dl>
      <div className="mt-3">
        <ExplorerLink hash={hash} />
      </div>
    </div>
  );
}

function Detail({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="font-medium text-text tabular-nums">{children}</dd>
      <dd className="text-xs text-text-muted">{hint}</dd>
    </div>
  );
}

function ExplorerLink({ hash }: { hash: Hash }) {
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-accent underline-offset-2 hover:underline"
    >
      View on {chain.blockExplorers.default.name}
      <ExternalIcon size={12} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
