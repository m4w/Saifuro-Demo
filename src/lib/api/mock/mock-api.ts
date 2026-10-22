import { ApiError, type PaymentsApi } from "../client";
import { getPaymentStatus, type Payment, type Review } from "../types";
import { AGENTS, buildPayments, MANDATES, REVIEWER } from "./seed";

const STORAGE_KEY = "apc:decisions:v1";

interface MockApiOptions {
  /** Where decisions are saved. null keeps them in memory only. */
  storage: Storage | null;
  latencyMs: number;
  now: () => number;
  /** Lets the "API outage" demo scenario make every call fail. */
  isOutage: () => boolean;
}

/**
 * A browser-side stand-in for the payments backend. The seed data is rebuilt on
 * load; only the reviewer's decisions are saved, so "Reset demo data" just
 * clears them.
 */
export function createMockApi(
  options: MockApiOptions,
): PaymentsApi & { reset(): void } {
  let payments: Payment[] | null = null;

  function load(): Payment[] {
    payments ??= buildPayments(options.now()).map((p) => {
      const review = readDecisions()[p.id];
      return review ? { ...p, review } : p;
    });
    return payments;
  }

  function readDecisions(): Record<string, Review> {
    try {
      return JSON.parse(options.storage?.getItem(STORAGE_KEY) ?? "{}");
    } catch {
      return {};
    }
  }

  function saveDecision(id: string, review: Review) {
    try {
      options.storage?.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...readDecisions(), [id]: review }),
      );
    } catch {
      // Storage can be full or blocked; the decision still applies until reload.
    }
  }

  async function respond<T>(work: () => T): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
    if (options.isOutage())
      throw new ApiError(
        "unavailable",
        "The payments service isn't responding.",
      );
    // Return copies, like a real network response would.
    return structuredClone(work());
  }

  function find(id: string): Payment {
    const payment = load().find((p) => p.id === id);
    if (!payment) throw new ApiError("not_found", `No payment with ID ${id}.`);
    return payment;
  }

  function agentFor(payment: Payment) {
    const agent = AGENTS.find((a) => a.id === payment.agentId);
    if (!agent) throw new Error(`Seed data has no agent ${payment.agentId}`);
    return agent;
  }

  return {
    listPayments: () =>
      respond(() => load().map((p) => ({ ...p, agent: agentFor(p) }))),

    getPayment: (id) =>
      respond(() => {
        const payment = find(id);
        const agent = agentFor(payment);
        const mandate = MANDATES.find((m) => m.id === agent.mandateId);
        if (!mandate)
          throw new Error(`Seed data has no mandate ${agent.mandateId}`);
        return { payment, agent, mandate };
      }),

    decidePayment: (id, input) =>
      respond(() => {
        const payment = find(id);
        if (getPaymentStatus(payment) !== "needs_approval") {
          throw new ApiError(
            "conflict",
            "This payment has already been decided.",
          );
        }
        const note = input.note.trim();
        if (input.decision === "rejected" && !note) {
          throw new ApiError(
            "invalid",
            "Add a note explaining why the payment is rejected.",
          );
        }
        const review: Review = {
          decision: input.decision,
          reviewer: REVIEWER,
          at: new Date(options.now()).toISOString(),
          note,
        };
        payment.review = review;
        saveDecision(id, review);
        return payment;
      }),

    reset() {
      try {
        options.storage?.removeItem(STORAGE_KEY);
      } catch {
        // Nothing saved, nothing to clear.
      }
      payments = null;
    },
  };
}
