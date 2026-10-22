import type { ReactNode } from "react";

/** Page title area. The h1 can take focus so RouteFocus can move focus to it after navigation. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {children}
      <h1
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight focus:outline-none"
      >
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>
      )}
    </header>
  );
}
