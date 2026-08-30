import { describe, it, expect } from "vitest";
import { computeOrderStatus } from "./orderStatus";

describe("computeOrderStatus", () => {
  it("stays pending when no tests have been reported yet", () => {
    const result = computeOrderStatus({
      currentStatus: "pending",
      totalTestIds: ["t1", "t2", "t3"],
      reportedTestIds: [],
    });
    expect(result).toBe("pending");
  });

  it("moves an in_progress order with zero reported tests to in_progress (no-op)", () => {
    const result = computeOrderStatus({
      currentStatus: "in_progress",
      totalTestIds: ["t1", "t2"],
      reportedTestIds: [],
    });
    expect(result).toBe("in_progress");
  });

  it("marks the order partially_reported when 1 of 3 tests is reported", () => {
    const result = computeOrderStatus({
      currentStatus: "in_progress",
      totalTestIds: ["t1", "t2", "t3"],
      reportedTestIds: ["t1"],
    });
    expect(result).toBe("partially_reported");
  });

  it("marks the order partially_reported when 2 of 3 tests is reported", () => {
    const result = computeOrderStatus({
      currentStatus: "partially_reported",
      totalTestIds: ["t1", "t2", "t3"],
      reportedTestIds: ["t1", "t2"],
    });
    expect(result).toBe("partially_reported");
  });

  it("marks the order completed only once every test is reported", () => {
    const result = computeOrderStatus({
      currentStatus: "partially_reported",
      totalTestIds: ["t1", "t2", "t3"],
      reportedTestIds: ["t1", "t2", "t3"],
    });
    expect(result).toBe("completed");
  });

  it("goes straight to completed for a single-test order once its one test is reported", () => {
    const result = computeOrderStatus({
      currentStatus: "in_progress",
      totalTestIds: ["t1"],
      reportedTestIds: ["t1"],
    });
    expect(result).toBe("completed");
  });

  it("never reopens a cancelled order, even if tests are reported", () => {
    const result = computeOrderStatus({
      currentStatus: "cancelled",
      totalTestIds: ["t1", "t2"],
      reportedTestIds: ["t1", "t2"],
    });
    expect(result).toBe("cancelled");
  });

  it("ignores duplicate/unknown reported test ids when counting", () => {
    const result = computeOrderStatus({
      currentStatus: "in_progress",
      totalTestIds: ["t1", "t2"],
      reportedTestIds: ["t1", "t1", "unrelated-id"],
    });
    expect(result).toBe("partially_reported");
  });

  it("leaves status untouched for an order with no tests at all", () => {
    const result = computeOrderStatus({
      currentStatus: "pending",
      totalTestIds: [],
      reportedTestIds: [],
    });
    expect(result).toBe("pending");
  });
});
