"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/shell/page-header";
import { ApiError } from "@/lib/api/client";
import { paymentQuery } from "@/lib/api/queries";
import { getPaymentStatus } from "@/lib/api/types";
import { formatUsdc } from "@/lib/format/amount";
import { formatDateTime, formatRelative } from "@/lib/format/time";
import { useNow } from "@/lib/use-now";
import { DecisionPanel } from "./decision-panel";
import { EmptyState, LoadError } from "./list-states";
import { PaymentFacts } from "./payment-facts";
import { PaymentTimeline } from "./payment-timeline";
import { MandateOverview, PolicyExplanation } from "./policy-explanation";
import { StatusBadge } from "./status-badge";
import { getLastList } from "./use-list-params";

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, error, refetch, isFetching } = useQuery(paymentQuery(id));
  const now = useNow();
  const back = getLastList();

  const backLink = (
    <Link
      href={back.href}
      className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
    >
      <ArrowLeftIcon size={14} />
      Back to {back.label.toLowerCase()}
    </Link>
  );

  if (error && !data) {
    if (error instanceof ApiError && error.code === "not_found") {
      return (
        <>
          <PageHeader title="Payment not found">{backLink}</PageHeader>
          <EmptyState title={`There's no payment with ID ${id}`}>
            It may have been removed, or the link is wrong.
          </EmptyState>
        </>
      );
    }
    return (
      <>
        <PageHeader title="Payment details">{backLink}</PageHeader>
        <LoadError
          title="Couldn't load this payment"
          error={error}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </>
    );
  }

  if (!data) return <DetailSkeleton>{backLink}</DetailSkeleton>;

  const { payment, agent, mandate } = data;
  return (
    <>
      <PageHeader
        title={`${formatUsdc(payment.amount)} to ${payment.payee.name}`}
        description={
          <>
            <span className="block text-text">{payment.purpose}</span>
            Requested by {agent.name}{" "}
            <time
              dateTime={payment.requestedAt}
              title={formatDateTime(payment.requestedAt)}
            >
              {formatRelative(payment.requestedAt, now)}
            </time>
          </>
        }
      >
        {backLink}
        <div className="mb-2">
          <StatusBadge status={getPaymentStatus(payment)} />
        </div>
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <PolicyExplanation payment={payment} agent={agent} />
          <DecisionPanel payment={payment} agent={agent} />
          <PaymentTimeline payment={payment} agent={agent} />
        </div>
        <div className="space-y-6">
          <PaymentFacts payment={payment} agent={agent} />
          <MandateOverview payment={payment} agent={agent} mandate={mandate} />
        </div>
      </div>
    </>
  );
}

export function DetailSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      {children}
      <p role="status" className="sr-only">
        Loading payment…
      </p>
      <Skeleton className="mb-2 h-5 w-28" />
      <Skeleton className="h-8 w-80 max-w-full" />
      <Skeleton className="mt-2 mb-6 h-4 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
