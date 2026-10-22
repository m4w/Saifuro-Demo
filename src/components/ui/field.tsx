import { useId, type ReactNode } from "react";

/** Shared look for text inputs, selects and text areas. */
export const inputStyles =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted " +
  "aria-[invalid=true]:border-danger";

interface ControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Renders the control with the ids that connect it to its label, hint and error. */
  children: (props: ControlProps) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
