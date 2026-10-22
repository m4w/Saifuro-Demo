import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/features/payments/list-states";
import { PaymentHistory } from "@/features/payments/payment-history";
import { PageHeader } from "@/features/shell/page-header";

export const metadata: Metadata = { title: "Payment history" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Payment history"
        description="Payments that were approved, rejected, or handled automatically by their agent's mandate."
      />
      <Suspense fallback={<ListSkeleton />}>
        <PaymentHistory />
      </Suspense>
    </>
  );
}
