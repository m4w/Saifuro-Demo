"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Last-resort boundary for unexpected errors. Expected ones (failed requests) are handled where they happen. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Alert
      tone="danger"
      role="alert"
      title="Something went wrong"
      action={
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}
