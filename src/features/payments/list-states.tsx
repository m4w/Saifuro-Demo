import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InboxIcon, RetryIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-text-muted">
        <InboxIcon size={20} />
      </span>
      <p className="mt-3 font-medium">{title}</p>
      {children && (
        <div className="mt-1 max-w-sm text-sm text-text-muted">{children}</div>
      )}
    </div>
  );
}

export function LoadError({
  title,
  error,
  onRetry,
  retrying,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Alert
      tone="danger"
      role="alert"
      title={title}
      action={
        <Button size="sm" onClick={onRetry} disabled={retrying}>
          <RetryIcon size={14} />
          {retrying ? "Trying again…" : "Try again"}
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}

/** Shown while a list page's data component loads. */
export function ListSkeleton() {
  return (
    <div className="space-y-3">
      <p role="status" className="sr-only">
        Loading payments…
      </p>
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
