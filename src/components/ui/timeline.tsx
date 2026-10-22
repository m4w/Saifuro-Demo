import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  CheckIcon,
  CircleIcon,
  DotIcon,
  MinusIcon,
  QuestionIcon,
  XIcon,
} from "./icons";

export type TimelineState =
  "complete" | "current" | "upcoming" | "failed" | "skipped" | "unknown";

const states: Record<
  TimelineState,
  { label: string; marker: string; icon: ReactNode }
> = {
  complete: {
    label: "Done",
    marker: "bg-success-soft text-success",
    icon: <CheckIcon size={14} />,
  },
  current: {
    label: "In progress",
    marker:
      "border-2 border-info bg-info-soft text-info motion-safe:animate-pulse-ring",
    icon: <DotIcon size={14} />,
  },
  upcoming: {
    label: "Not started",
    marker: "border border-border-strong bg-surface text-text-muted",
    icon: <CircleIcon size={12} />,
  },
  failed: {
    label: "Failed",
    marker: "bg-danger-soft text-danger",
    icon: <XIcon size={14} />,
  },
  skipped: {
    label: "Skipped",
    marker: "bg-neutral-soft text-neutral",
    icon: <MinusIcon size={14} />,
  },
  unknown: {
    label: "Unknown",
    marker: "bg-warning-soft text-warning",
    icon: <QuestionIcon size={14} />,
  },
};

/** An ordered list of steps. Each step's state is shown by icon, words and color together. */
export function Timeline({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {children}
    </ol>
  );
}

interface TimelineItemProps {
  state: TimelineState;
  title: string;
  /** Usually a <time>. */
  meta?: ReactNode;
  children?: ReactNode;
}

export function TimelineItem({
  state,
  title,
  meta,
  children,
}: TimelineItemProps) {
  const { label, marker, icon } = states[state];
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      className="group relative flex gap-3 pb-6 last:pb-0"
    >
      {/* Line to the next step */}
      <span
        aria-hidden="true"
        className="absolute top-7 bottom-1 left-2.75 w-px bg-border group-last:hidden"
      />
      <span
        className={cn(
          "relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
          marker,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p
            className={cn(
              "font-medium",
              (state === "upcoming" || state === "skipped") &&
                "text-text-muted",
            )}
          >
            {title}
            <span className="sr-only">: {label}.</span>
          </p>
          {meta && <p className="text-xs text-text-muted">{meta}</p>}
        </div>
        {children && (
          <div className="mt-1 text-sm text-text-muted">{children}</div>
        )}
      </div>
    </li>
  );
}
