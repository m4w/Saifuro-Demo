"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Hash } from "viem";
import { Panel } from "@/components/ui/panel";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import type { Agent, Payment } from "@/lib/api/types";
import { chainHeadQuery, receiptQuery } from "@/lib/chain/queries";
import { toOnchainStatus, type OnchainStatus } from "@/lib/chain/settlement";
import { formatDateTime } from "@/lib/format/time";
import { buildTimeline } from "@/lib/timeline/build-timeline";
import { OnchainDetails } from "./onchain-details";

export function PaymentTimeline({
  payment,
  agent,
}: {
  payment: Payment;
  agent: Agent;
}) {
  return (
    <Panel title="Progress">
      {payment.settlement ? (
        <SettledTimeline
          payment={payment}
          agent={agent}
          hash={payment.settlement.txHash}
        />
      ) : (
        <Steps payment={payment} agent={agent} onchain={null} />
      )}
    </Panel>
  );
}

/** For payments with a transaction: reads its status live from Base Sepolia. */
function SettledTimeline({
  payment,
  agent,
  hash,
}: {
  payment: Payment;
  agent: Agent;
  hash: Hash;
}) {
  const receipt = useQuery(receiptQuery(hash));
  // Confirmations only matter once the payment is recorded.
  const head = useQuery({
    ...chainHeadQuery,
    enabled: receipt.data?.state === "success",
  });
  const onchain = toOnchainStatus(
    { data: receipt.data, isError: receipt.isError },
    head.data,
  );

  return (
    <Steps
      payment={payment}
      agent={agent}
      onchain={onchain}
      onchainDetails={
        <OnchainDetails
          status={onchain}
          payment={payment}
          hash={hash}
          retrying={receipt.isFetching}
          onRetry={() => {
            void receipt.refetch();
            if (head.isError) void head.refetch();
          }}
        />
      }
    />
  );
}

function Steps({
  payment,
  agent,
  onchain,
  onchainDetails,
}: {
  payment: Payment;
  agent: Agent;
  onchain: OnchainStatus | null;
  onchainDetails?: ReactNode;
}) {
  const steps = buildTimeline(payment, agent.name, onchain);
  return (
    <Timeline label="Payment progress">
      {steps.map((step) => (
        <TimelineItem
          key={step.id}
          state={step.state}
          title={step.label}
          meta={
            step.at && <time dateTime={step.at}>{formatDateTime(step.at)}</time>
          }
        >
          <p>{step.description}</p>
          {step.id === "onchain" && onchainDetails}
        </TimelineItem>
      ))}
    </Timeline>
  );
}
