import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovalQueue } from "@/features/approvals/approval-queue";
import { ListSkeleton } from "@/features/payments/list-states";
import { PageHeader } from "@/features/shell/page-header";

export const metadata: Metadata = { title: "Approval queue" };

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader
        title="Approval queue"
        description="Payments your agents want to make that broke a rule in their mandate. Open one to see why, then approve or reject it."
      />
      <Suspense fallback={<ListSkeleton />}>
        <ApprovalQueue />
      </Suspense>
    </>
  );
}
