export type OrderStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "partially_reported"
  | "completed"
  | "cancelled";

export interface ComputeOrderStatusInput {
  currentStatus: OrderStatus;
  totalTestIds: string[];
  reportedTestIds: string[];
}

/**
 * Derives the correct order status from how many of its tests have a
 * reported result, instead of letting report-generation code set
 * `completed` directly. `cancelled` is left untouched; an order with no
 * tests keeps its current status since there is nothing to derive from.
 */
export function computeOrderStatus({
  currentStatus,
  totalTestIds,
  reportedTestIds,
}: ComputeOrderStatusInput): OrderStatus {
  if (currentStatus === "cancelled") return "cancelled";
  if (totalTestIds.length === 0) return currentStatus;

  const reportedSet = new Set(reportedTestIds);
  const reportedCount = totalTestIds.filter((id) => reportedSet.has(id)).length;

  if (reportedCount === 0) {
    return currentStatus === "pending" || currentStatus === "confirmed"
      ? currentStatus
      : "in_progress";
  }

  if (reportedCount < totalTestIds.length) return "partially_reported";

  return "completed";
}
