import { useSyncExternalStore } from "react";

/**
 * Demo scenarios let reviewers see states that are hard to hit for real:
 * an RPC outage, or a transfer the network hasn't recorded yet (Base records
 * transfers within ~2 seconds). They are clearly labeled in the UI and stored
 * per browser tab, so nobody gets stuck in one.
 */
export type Scenario = "api_outage" | "rpc_outage" | "tx_unconfirmed";

/** A paid-out payment, where the Base scenarios show. The seed numbers these pay_S1, pay_S2, … */
const PAID_OUT_PAYMENT = "/payments/pay_S1";

export const SCENARIOS: Record<
  Scenario,
  { label: string; description: string; example?: string }
> = {
  api_outage: {
    label: "Payments service outage",
    description: "Every request to the payments service fails.",
  },
  rpc_outage: {
    label: "Base network unreachable",
    description: "Reading transactions from Base Sepolia fails.",
    example: PAID_OUT_PAYMENT,
  },
  tx_unconfirmed: {
    label: "Transfers not recorded yet",
    description:
      "Paid-out payments look like the network hasn't recorded them yet.",
    example: PAID_OUT_PAYMENT,
  },
};

const STORAGE_KEY = "apc:scenarios";
const EMPTY: ReadonlySet<Scenario> = new Set();
let active: ReadonlySet<Scenario> | null = null;
const listeners = new Set<() => void>();

export function getScenarios(): ReadonlySet<Scenario> {
  if (typeof window === "undefined") return EMPTY;
  if (!active) {
    try {
      active = new Set(
        JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as Scenario[],
      );
    } catch {
      active = EMPTY;
    }
  }
  return active;
}

export function setScenario(scenario: Scenario, on: boolean): void {
  const next = new Set(getScenarios());
  if (on) next.add(scenario);
  else next.delete(scenario);
  active = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Not saved; still applies until reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useScenarios(): ReadonlySet<Scenario> {
  return useSyncExternalStore(subscribe, getScenarios, () => EMPTY);
}
