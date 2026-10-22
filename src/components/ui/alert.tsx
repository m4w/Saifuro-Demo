import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";

type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, { box: string; icon: ReactNode }> = {
  info: {
    box: "border-info/30 bg-info-soft",
    icon: <InfoIcon className="text-info" />,
  },
  success: {
    box: "border-success/30 bg-success-soft",
    icon: <CheckIcon className="text-success" />,
  },
  warning: {
    box: "border-warning/30 bg-warning-soft",
    icon: <AlertIcon className="text-warning" />,
  },
  danger: {
    box: "border-danger/30 bg-danger-soft",
    icon: <AlertIcon className="text-danger" />,
  },
};

interface AlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** "alert" for errors that appear after an action, "status" for quiet updates. */
  role?: "alert" | "status";
  ref?: Ref<HTMLDivElement>;
  /** Lets code move focus here, e.g. after a decision. */
  focusable?: boolean;
  className?: string;
}

export function Alert({
  tone = "info",
  title,
  children,
  action,
  role,
  ref,
  focusable,
  className,
}: AlertProps) {
  return (
    <div
      ref={ref}
      role={role}
      tabIndex={focusable ? -1 : undefined}
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm text-text",
        tones[tone].box,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{tones[tone].icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 text-text-muted">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
