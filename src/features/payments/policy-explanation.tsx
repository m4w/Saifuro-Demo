import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import {
  getPaymentStatus,
  type Agent,
  type Mandate,
  type Payment,
} from "@/lib/api/types";
import { formatDate } from "@/lib/format/time";
import { describeRule, explainPolicy } from "@/lib/policy/explain";

const titles = {
  needs_approval: "Why this needs approval",
  blocked: "Why this was blocked",
  approved: "Policy check",
  rejected: "Policy check",
  auto_approved: "Policy check",
} as const;

export function PolicyExplanation({
  payment,
  agent,
}: {
  payment: Payment;
  agent: Agent;
}) {
  const { headline, reasons } = explainPolicy(payment.policy, agent.name);
  return (
    <Panel title={titles[getPaymentStatus(payment)]}>
      <p>{headline}</p>
      {reasons.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reasons.map((reason) => (
            <li
              key={reason.ruleId}
              className="rounded-md border border-border bg-canvas p-3"
            >
              <Badge tone={reason.blocking ? "danger" : "warning"}>
                {reason.label}
              </Badge>
              <p className="mt-1.5 text-sm">{reason.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** The whole mandate, with the rules this payment broke marked. */
export function MandateOverview({
  payment,
  agent,
  mandate,
}: {
  payment: Payment;
  agent: Agent;
  mandate: Mandate;
}) {
  const hits = new Map(payment.policy.hits.map((h) => [h.ruleId, h]));
  return (
    <Panel title={`${agent.name}'s mandate`}>
      <p className="text-sm text-text-muted">
        Approved by {mandate.approvedBy} on {formatDate(mandate.approvedAt)}.
      </p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {mandate.rules.map((rule) => {
          const hit = hits.get(rule.id);
          return (
            <li key={rule.id}>
              {hit && (
                <Badge tone={hit.action === "block" ? "danger" : "warning"}>
                  {hit.action === "block"
                    ? "Blocked this payment"
                    : "Triggered by this payment"}
                </Badge>
              )}
              <p className={hit ? "mt-1" : undefined}>{describeRule(rule)}</p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
