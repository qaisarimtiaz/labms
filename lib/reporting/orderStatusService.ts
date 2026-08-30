import TestOrder from "@/lib/models/TestOrder";
import TestResult from "@/lib/models/TestResult";
import { computeOrderStatus, OrderStatus } from "./orderStatus";

/**
 * Recomputes an order's status from how many of its tests currently have a
 * TestResult, and persists it if it changed. Call this after any result is
 * created/updated instead of writing `orderStatus` directly — that's what
 * let a single reported test close out the whole order in the past.
 */
export async function recomputeOrderStatus(orderId: string): Promise<OrderStatus> {
  const order = await TestOrder.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const totalTestIds: string[] = (order.tests || []).map((t: { toString(): string }) => t.toString());

  const results = await TestResult.find({ testOrder: orderId }).select("test");
  const reportedTestIds = results.map((r) => r.test.toString());

  const nextStatus = computeOrderStatus({
    currentStatus: order.orderStatus as OrderStatus,
    totalTestIds,
    reportedTestIds,
  });

  if (nextStatus !== order.orderStatus) {
    order.orderStatus = nextStatus;
    if (nextStatus === "completed" && !order.completedAt) {
      order.completedAt = new Date();
    }
    await order.save();
  }

  return nextStatus;
}
