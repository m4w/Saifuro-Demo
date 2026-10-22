"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SCENARIOS, setScenario, useScenarios } from "@/lib/demo/scenarios";

/** Makes it obvious when a simulated problem is switched on. */
export function ScenarioBanner() {
  const active = useScenarios();
  const queryClient = useQueryClient();
  if (active.size === 0) return null;

  return (
    <Alert
      tone="warning"
      title={`Demo scenario on: ${[...active].map((s) => SCENARIOS[s].label).join(", ")}`}
      className="mx-4 mt-4 sm:mx-8"
      action={
        <Button
          size="sm"
          onClick={() => {
            active.forEach((s) => setScenario(s, false));
            void queryClient.resetQueries();
          }}
        >
          Turn off
        </Button>
      }
    >
      Some errors on this page are simulated. Turn the scenario off to see real
      data again.
    </Alert>
  );
}
