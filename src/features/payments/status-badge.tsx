import type { ReactNode } from "react";
import { Badge, type Tone } from "@/components/ui/badge";
import { BanIcon, CheckIcon, ClockIcon, XIcon } from "@/components/ui/icons";
import type { PaymentStatus, RuleHit } from "@/lib/api/types";
import { RULE_LABELS } from "@/lib/policy/explain";

const statuses: Record<
  PaymentStatus,
  { label: string; tone: Tone; icon: ReactNode }
> = {
  needs_approval: {
    label: "Needs approval",
    tone: "warning",
    icon: <ClockIcon size={12} />,
  },
  approved: {
    label: "Approved",
    tone: "success",
    icon: <CheckIcon size={12} />,
  },
  auto_approved: {
    label: "Auto-approved",
    tone: "success",
    icon: <CheckIcon size={12} />,
  },
  rejected: { label: "Rejected", tone: "danger", icon: <XIcon size={12} /> },
  blocked: { label: "Blocked", tone: "danger", icon: <BanIcon size={12} /> },
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, tone, icon } = statuses[status];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}

/** The rules a payment broke, as short labels. */
export function RuleBadges({ hits }: { hits: RuleHit[] }) {
  if (hits.length === 0) return <span className="text-text-muted">None</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {hits.map((hit) => (
        <li key={hit.ruleId}>
          <Badge tone={hit.action === "block" ? "danger" : "warning"}>
            {RULE_LABELS[hit.kind]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
