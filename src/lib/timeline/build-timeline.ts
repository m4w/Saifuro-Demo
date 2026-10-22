import { getPaymentStatus, type IsoDate, type Payment } from "@/lib/api/types";
import type { OnchainStatus } from "@/lib/chain/settlement";
import { formatUsdc } from "@/lib/format/amount";

export type StepState =
  "complete" | "current" | "upcoming" | "failed" | "skipped" | "unknown";
export type StepId =
  "requested" | "policy" | "approval" | "onchain" | "confirmed";

export interface TimelineStep {
  id: StepId;
  label: string;
  state: StepState;
  description: string;
  at?: IsoDate;
}

/** Measured on Base Sepolia: the finalized block trails the newest block by ~19 minutes. */
export const FINALITY_HINT = "This usually takes about 20 minutes.";

/**
 * Maps a payment and what we know about it onchain to the five steps of its
 * timeline. `onchain` is null when the payment has no transaction.
 */
export function buildTimeline(
  payment: Payment,
  agentName: string,
  onchain: OnchainStatus | null,
): TimelineStep[] {
  const status = getPaymentStatus(payment);
  const { policy, review } = payment;
  const hitCount = policy.hits.length;

  const requested: TimelineStep = {
    id: "requested",
    label: "Requested",
    state: "complete",
    at: payment.requestedAt,
    description: `${agentName} asked to pay ${formatUsdc(payment.amount)} to ${payment.payee.name}.`,
  };

  const policyStep: TimelineStep = {
    id: "policy",
    label: "Policy check",
    at: policy.evaluatedAt,
    ...(policy.outcome === "blocked"
      ? { state: "failed", description: "Blocked by the mandate." }
      : policy.outcome === "auto_approved"
        ? { state: "complete", description: "Within the mandate." }
        : {
            state: "complete",
            description: `Needs approval: ${hitCount === 1 ? "1 rule" : `${hitCount} rules`} broken.`,
          }),
  };

  const approval: TimelineStep = {
    id: "approval",
    label: "Human approval",
    ...approvalState(),
  };
  const [sent, confirmed] = onchainSteps();
  return [requested, policyStep, approval, sent, confirmed];

  function approvalState(): Pick<TimelineStep, "state" | "description" | "at"> {
    switch (status) {
      case "blocked":
        return {
          state: "skipped",
          description: "Not possible: the payment was blocked.",
        };
      case "auto_approved":
        return {
          state: "skipped",
          description: "Not needed: the payment is within the mandate.",
        };
      case "needs_approval":
        return { state: "current", description: "Waiting for a reviewer." };
      case "approved":
        return {
          state: "complete",
          at: review!.at,
          description: `Approved by ${review!.reviewer}.`,
        };
      case "rejected":
        return {
          state: "failed",
          at: review!.at,
          description: `Rejected by ${review!.reviewer}.`,
        };
    }
  }

  function onchainSteps(): [TimelineStep, TimelineStep] {
    const step = (
      id: StepId,
      label: string,
      rest: Pick<TimelineStep, "state" | "description" | "at">,
    ) => ({
      id,
      label,
      ...rest,
    });
    const sent = (rest: Pick<TimelineStep, "state" | "description" | "at">) =>
      step("onchain", "Sent on Base", rest);
    const final = (rest: Pick<TimelineStep, "state" | "description" | "at">) =>
      step("confirmed", "Confirmed", rest);

    if (status === "rejected" || status === "blocked") {
      return [
        sent({ state: "skipped", description: "Not sent." }),
        final({ state: "skipped", description: "Not sent." }),
      ];
    }
    if (status === "needs_approval") {
      return [
        sent({ state: "upcoming", description: "Sent once approved." }),
        final({
          state: "upcoming",
          description: "Final once the network confirms it.",
        }),
      ];
    }
    if (!payment.settlement || !onchain) {
      return [
        sent({
          state: "upcoming",
          description:
            "Approved. This demo doesn't send payments, so it ends here.",
        }),
        final({
          state: "upcoming",
          description: "Final once the network confirms it.",
        }),
      ];
    }

    switch (onchain.state) {
      case "loading":
        return [
          sent({ state: "current", description: "Checking the Base network…" }),
          final({
            state: "upcoming",
            description: "Final once the network confirms it.",
          }),
        ];
      case "unavailable":
        return [
          sent({
            state: "unknown",
            description:
              "Couldn't reach the Base network to check this payment.",
          }),
          final({
            state: "unknown",
            description: "Unknown until the network can be reached.",
          }),
        ];
      case "not_found":
        return [
          sent({
            state: "current",
            description: "Sent. Waiting for the network to record it.",
          }),
          final({
            state: "upcoming",
            description: "Final once the network confirms it.",
          }),
        ];
      case "reverted":
        return [
          sent({
            state: "failed",
            at: onchain.recordedAt,
            description: "The network rejected this transfer. No money moved.",
          }),
          final({
            state: "skipped",
            description: "Not confirmed: the transfer failed.",
          }),
        ];
      case "recorded":
        return [
          sent({
            state: "complete",
            at: onchain.recordedAt,
            description: "Recorded on Base.",
          }),
          onchain.finalized
            ? final({
                state: "complete",
                description: "Final. This payment can no longer be reversed.",
              })
            : final({
                state: "current",
                description:
                  onchain.finalized === null
                    ? "Checking whether the payment is final…"
                    : `Recorded, becoming final. ${FINALITY_HINT}`,
              }),
        ];
    }
  }
}
