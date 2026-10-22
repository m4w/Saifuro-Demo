"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  stretchedLink,
  type Column,
} from "@/components/ui/data-table";
import { inputStyles } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";
import { paymentsQuery } from "@/lib/api/queries";
import {
  getPaymentStatus,
  type PaymentListItem,
  type RuleKind,
} from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatUsdc } from "@/lib/format/amount";
import { formatDateTime, formatDuration } from "@/lib/format/time";
import { RULE_LABELS } from "@/lib/policy/explain";
import { useNow } from "@/lib/use-now";
import { EmptyState, LoadError } from "@/features/payments/list-states";
import { RuleBadges } from "@/features/payments/status-badge";
import { useListParams } from "@/features/payments/use-list-params";

const RULE_KINDS = Object.keys(RULE_LABELS) as RuleKind[];

export function ApprovalQueue() {
  const { data, error, refetch, isFetching } = useQuery(paymentsQuery);
  const now = useNow();
  const params = useListParams(
    { columnId: "waiting", direction: "desc" },
    { label: "Approval queue" },
  );
  const [search, setSearch] = useState(params.get("q"));
  const agentId = params.get("agent");
  const rule = params.get("rule");

  const pending = useMemo(
    () => (data ?? []).filter((p) => getPaymentStatus(p) === "needs_approval"),
    [data],
  );
  const agents = useMemo(() => {
    const byId = new Map(pending.map((p) => [p.agent.id, p.agent]));
    // Keep the selected agent listed once its last payment leaves the queue, so the active filter stays visible.
    const selected = data?.find((p) => p.agent.id === agentId)?.agent;
    if (selected) byId.set(selected.id, selected);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data, pending, agentId]);

  const term = search.trim().toLowerCase();
  const rows = pending.filter(
    (p) =>
      (!term ||
        [p.agent.name, p.payee.name, p.purpose].some((text) =>
          text.toLowerCase().includes(term),
        )) &&
      (!agentId || p.agent.id === agentId) &&
      (!rule || p.policy.hits.some((h) => h.kind === rule)),
  );
  const filtered = Boolean(term || agentId || rule);

  function clearFilters() {
    setSearch("");
    params.update({ q: null, agent: null, rule: null });
  }

  const columns: Column<PaymentListItem>[] = [
    {
      id: "agent",
      header: "Agent",
      sortValue: (p) => p.agent.name,
      cell: (p) => (
        <>
          <span className="font-medium">{p.agent.name}</span>
          <span className="block text-xs text-text-muted">{p.agent.team}</span>
        </>
      ),
    },
    {
      id: "payee",
      header: "Payee",
      sortValue: (p) => p.payee.name,
      cell: (p) => (
        <>
          <span className="font-medium">{p.payee.name}</span>
          <span
            className="block max-w-64 truncate text-xs text-text-muted"
            title={p.purpose}
          >
            {p.purpose}
          </span>
        </>
      ),
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
      id: "rule",
      header: "Rule triggered",
      cell: (p) => <RuleBadges hits={p.policy.hits} />,
    },
    {
      id: "waiting",
      header: "Waiting",
      firstDirection: "desc",
      sortValue: (p) => now - Date.parse(p.requestedAt),
      cell: (p) => (
        <time
          dateTime={p.requestedAt}
          title={`Requested ${formatDateTime(p.requestedAt)}`}
          className="tabular-nums"
        >
          {formatDuration(now - Date.parse(p.requestedAt))}
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
          // Starts with the visible word, so voice control users can say "Review".
          aria-label={`Review: ${formatUsdc(p.amount)} to ${p.payee.name}`}
          className={cn(
            stretchedLink,
            "font-medium text-accent underline-offset-2 hover:underline",
          )}
        >
          Review
        </Link>
      ),
    },
  ];

  if (error && !data) {
    return (
      <LoadError
        title="Couldn't load the approval queue"
        error={error}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      <search
        className="flex flex-wrap items-end gap-3"
        aria-label="Filter payments"
      >
        <div className="w-full sm:w-72">
          <label
            htmlFor="queue-search"
            className="block text-xs font-medium text-text-muted"
          >
            Search
          </label>
          <div className="relative mt-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted" />
            <input
              id="queue-search"
              type="search"
              value={search}
              placeholder="Agent, payee or purpose"
              onChange={(e) => {
                setSearch(e.target.value);
                params.update({ q: e.target.value || null });
              }}
              className={cn(inputStyles, "pl-8")}
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <label
            htmlFor="queue-agent"
            className="block text-xs font-medium text-text-muted"
          >
            Agent
          </label>
          <select
            id="queue-agent"
            value={agentId}
            onChange={(e) => params.update({ agent: e.target.value || null })}
            className={cn(inputStyles, "mt-1")}
          >
            <option value="">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label
            htmlFor="queue-rule"
            className="block text-xs font-medium text-text-muted"
          >
            Rule triggered
          </label>
          <select
            id="queue-rule"
            value={rule}
            onChange={(e) => params.update({ rule: e.target.value || null })}
            className={cn(inputStyles, "mt-1")}
          >
            <option value="">All rules</option>
            {RULE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {RULE_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>
        {filtered && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </search>

      <p role="status" className="text-sm text-text-muted">
        {!data
          ? "Loading payments…"
          : filtered
            ? `Showing ${rows.length} of ${pending.length} payments waiting for approval`
            : `${pending.length} ${pending.length === 1 ? "payment" : "payments"} waiting for approval`}
      </p>

      <DataTable
        caption="Payments waiting for approval"
        columns={columns}
        rows={rows}
        getRowKey={(p) => p.id}
        sort={params.sort}
        onSortChange={params.setSort}
        loading={!data}
        empty={
          filtered ? (
            <EmptyState title="No payments match your filters">
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </EmptyState>
          ) : (
            <EmptyState title="All caught up">
              No payments are waiting for approval. New requests that break a
              mandate rule will show up here.{" "}
              <Link
                href="/payments"
                className="text-accent underline underline-offset-2"
              >
                View payment history
              </Link>
            </EmptyState>
          )
        }
      />
    </div>
  );
}
