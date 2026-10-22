import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DetailSkeleton,
  PaymentDetail,
} from "@/features/payments/payment-detail";

export const metadata: Metadata = { title: "Payment details" };

export default function PaymentPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PaymentDetail />
    </Suspense>
  );
}
