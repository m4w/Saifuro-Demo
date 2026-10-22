import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getScenarios } from "@/lib/demo/scenarios";
import { createMockApi } from "./mock/mock-api";
import type { DecisionInput } from "./types";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The app's only backend. Swap this for a fetch-based PaymentsApi to use a real one. */
export const api = createMockApi({
  storage: browserStorage(),
  latencyMs: 350,
  now: () => Date.now(),
  isOutage: () => getScenarios().has("api_outage"),
});

export const paymentKeys = {
  all: ["payments"] as const,
  detail: (id: string) => ["payments", id] as const,
};

export const paymentsQuery = queryOptions({
  queryKey: paymentKeys.all,
  queryFn: () => api.listPayments(),
});

export const paymentQuery = (id: string) =>
  queryOptions({
    queryKey: paymentKeys.detail(id),
    queryFn: () => api.getPayment(id),
  });

export function useDecidePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DecisionInput) => api.decidePayment(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}
