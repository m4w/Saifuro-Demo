"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SlidersIcon } from "@/components/ui/icons";
import { api } from "@/lib/api/queries";
import {
  SCENARIOS,
  setScenario,
  useScenarios,
  type Scenario,
} from "@/lib/demo/scenarios";

export function DemoControls() {
  const [open, setOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const active = useScenarios();
  const queryClient = useQueryClient();

  function toggle(scenario: Scenario, on: boolean) {
    setScenario(scenario, on);
    // Start over, so the next read shows the new scenario instead of cached data.
    void queryClient.resetQueries();
  }

  function resetData() {
    api.reset();
    void queryClient.resetQueries();
    setResetDone(true);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => {
          setResetDone(false);
          setOpen(true);
        }}
      >
        <SlidersIcon size={14} />
        Demo controls
        {active.size > 0 && (
          <span className="text-warning">({active.size} on)</span>
        )}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Demo controls"
        description="Simulate problems to see how the console handles them. Settings last until you close this tab."
      >
        <fieldset>
          <legend className="text-sm font-medium">Simulate</legend>
          <div className="mt-2 space-y-3">
            {(Object.keys(SCENARIOS) as Scenario[]).map((scenario) => {
              const example = SCENARIOS[scenario].example;
              return (
                <div key={scenario}>
                  <label className="flex cursor-pointer gap-3">
                    <input
                      type="checkbox"
                      checked={active.has(scenario)}
                      onChange={(e) => toggle(scenario, e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-accent"
                    />
                    <span className="text-sm">
                      <span className="block font-medium">
                        {SCENARIOS[scenario].label}
                      </span>
                      <span className="block text-text-muted">
                        {SCENARIOS[scenario].description}
                      </span>
                    </span>
                  </label>
                  {/* Outside the label, so the link isn't part of the checkbox's name. */}
                  {example && (
                    <p className="mt-1 pl-7 text-sm text-text-muted">
                      Shows on paid-out payments only.{" "}
                      <Link
                        href={example}
                        // Close, so the page behind shows the change.
                        onClick={() => setOpen(false)}
                        className="font-medium text-accent underline underline-offset-2"
                      >
                        See an example
                      </Link>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm font-medium">Demo data</p>
          <p className="mt-0.5 text-sm text-text-muted">
            Undo all approvals and rejections you made.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Button size="sm" onClick={resetData}>
              Reset demo data
            </Button>
            <p role="status" className="text-sm text-success">
              {resetDone ? "Demo data reset." : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Dialog>
    </>
  );
}
