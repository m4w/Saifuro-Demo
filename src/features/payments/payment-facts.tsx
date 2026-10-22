import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import type { Agent, Payment } from "@/lib/api/types";
import { formatUsdc } from "@/lib/format/amount";
import { formatDateTime } from "@/lib/format/time";

export function PaymentFacts({
  payment,
  agent,
}: {
  payment: Payment;
  agent: Agent;
}) {
  return (
    <Panel title="Details">
      <dl className="space-y-3 text-sm">
        <Fact label="Amount">
          <span className="tabular-nums">{formatUsdc(payment.amount)}</span>
        </Fact>
        <Fact label="Agent">
          {agent.name}
          <span className="block text-text-muted">
            {agent.team} · {agent.description}
          </span>
        </Fact>
        <Fact label="Payee">
          {payment.payee.name}
          <span className="block font-mono text-xs break-all text-text-muted">
            {payment.payee.address}
          </span>
        </Fact>
        <Fact label="Requested">{formatDateTime(payment.requestedAt)}</Fact>
        <Fact label="Network">Base Sepolia (test network)</Fact>
        <Fact label="Payment ID">
          <span className="font-mono text-xs">{payment.id}</span>
        </Fact>
      </dl>
    </Panel>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
