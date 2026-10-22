import { cn } from "@/lib/cn";

/** Placeholder shape while content loads. Hidden from assistive tech; pair it with a status message. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded bg-surface-muted motion-safe:animate-pulse",
        className,
      )}
    />
  );
}
