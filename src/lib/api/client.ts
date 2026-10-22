import type {
  DecisionInput,
  Payment,
  PaymentDetail,
  PaymentListItem,
} from "./types";

/**
 * The backend contract the UI depends on. The demo uses a mock implementation
 * that runs in the browser; a real backend would implement the same interface
 * with fetch calls.
 */
export interface PaymentsApi {
  listPayments(): Promise<PaymentListItem[]>;
  getPayment(id: string): Promise<PaymentDetail>;
  decidePayment(id: string, input: DecisionInput): Promise<Payment>;
}

export type ApiErrorCode = "not_found" | "conflict" | "invalid" | "unavailable";

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
