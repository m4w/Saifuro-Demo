"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  DataTable,
  stretchedLink,
  type Column,
} from "@/components/ui/data-table";
import { paymentsQuery } from "@/lib/api/queries";
import {
  getPaymentStatus,
  type Payment,
  type PaymentListItem,
} from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatUsdc } from "@/lib/format/amount";
import { formatDateTime, formatRelative } from "@/lib/format/time";
import { useNow } from "@/lib/use-now";
import { EmptyState, LoadError } from "./list-states";
import { StatusBadge } from "./status-badge";
import { useListParams } from "./use-list-params";

/** When the outcome was decided: by a person, or by the policy check. */
function decidedAt(p: Payment): string {
  return p.review?.at ?? p.policy.evaluatedAt;
}

export function PaymentHistory() {
  const { data, error, refetch, isFetching } = useQuery(paymentsQuery);
  const now = useNow();
  const params = useListParams(
    { columnId: "decided", direction: "desc" },
    { label: "Payment history" },
  );
  const rows = (data ?? []).filter(
    (p) => getPaymentStatus(p) !== "needs_approval",
  );

  const columns: Column<PaymentListItem>[] = [
    {
      id: "agent",
      header: "Agent",
      sortValue: (p) => p.agent.name,
      cell: (p) => <span className="font-medium">{p.agent.name}</span>,
    },
    {
      id: "payee",
      header: "Payee",
      sortValue: (p) => p.payee.name,
      cell: (p) => <span className="font-medium">{p.payee.name}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      align: "end",
      firstDirection: "desc",
      sortValue: (p) => BigInt(p.amount),
      cell: (p) => (
        <span className="font-medium tabular-nums">{formatUsdc(p.amount)}</span>
      ),
    },
    {
      id: "status",
      header: "Outcome",
      sortValue: (p) => getPaymentStatus(p),
      cell: (p) => <StatusBadge status={getPaymentStatus(p)} />,
    },
    {
      id: "decided",
      header: "Decided",
      firstDirection: "desc",
      sortValue: (p) => Date.parse(decidedAt(p)),
      cell: (p) => (
        <time dateTime={decidedAt(p)} title={formatDateTime(decidedAt(p))}>
          {formatRelative(decidedAt(p), now)}
        </time>
      ),
    },
    {
      id: "action",
      header: "Action",
      srOnlyHeader: true,
      align: "end",
      cell: (p) => (
        <Link
          href={`/payments/${p.id}`}
          // Starts with the visible word, so voice control users can say "Details".
          aria-label={`Details: ${formatUsdc(p.amount)} to ${p.payee.name}`}
          className={cn(
            stretchedLink,
            "font-medium text-accent underline-offset-2 hover:underline",
          )}
        >
          Details
        </Link>
      ),
    },
  ];

  if (error && !data) {
    return (
      <LoadError
        title="Couldn't load payment history"
        error={error}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p role="status" className="text-sm text-text-muted">
        {data
          ? `${rows.length} ${rows.length === 1 ? "payment" : "payments"}`
          : "Loading payments…"}
      </p>
      <DataTable
        caption="Payment history"
        columns={columns}
        rows={rows}
        getRowKey={(p) => p.id}
        sort={params.sort}
        onSortChange={params.setSort}
        loading={!data}
        empty={
          <EmptyState title="No decided payments yet">
            Approved, rejected and blocked payments show up here.
          </EmptyState>
        }
      />
    </div>
  );
}
