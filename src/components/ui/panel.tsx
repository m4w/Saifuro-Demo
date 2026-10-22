import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A titled section on a surface. Its heading names the region for screen readers. */
export function Panel({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "rounded-lg border border-border bg-surface p-5",
        className,
      )}
    >
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
