import { describe, it, expect } from "vitest";
import { planPageAnnotations, buildReportSummary } from "./pdfLayout";

describe("planPageAnnotations", () => {
  it("puts the address footer on every page of a single-page report", () => {
    const plan = planPageAnnotations([{ pageNumber: 1, testName: "CBC" }]);
    expect(plan).toHaveLength(1);
    expect(plan[0].showAddressFooter).toBe(true);
  });

  it("puts the address footer on BOTH pages of a 2-page test, not just the last one", () => {
    const plan = planPageAnnotations([
      { pageNumber: 1, testName: "Gangliosides" },
      { pageNumber: 2, testName: "Gangliosides" },
    ]);
    expect(plan.every((p) => p.showAddressFooter)).toBe(true);
  });

  it("puts the electronically-issued statement on every page across multiple tests", () => {
    const plan = planPageAnnotations([
      { pageNumber: 1, testName: "Gangliosides" },
      { pageNumber: 2, testName: "Gangliosides" },
      { pageNumber: 3, testName: "Myopathies" },
    ]);
    expect(plan.every((p) => p.showElectronicIssuedStatement)).toBe(true);
  });

  it("does not gate either annotation on being the last page in the document", () => {
    const pages = [
      { pageNumber: 1, testName: "CBC" },
      { pageNumber: 2, testName: "LFT" },
      { pageNumber: 3, testName: "RFT" },
    ];
    const plan = planPageAnnotations(pages);
    const nonLastPages = plan.filter((p) => p.pageNumber !== pages.length);
    expect(nonLastPages.length).toBeGreaterThan(0);
    for (const page of nonLastPages) {
      expect(page.showAddressFooter).toBe(true);
      expect(page.showElectronicIssuedStatement).toBe(true);
    }
  });

  it("returns an empty plan for an empty page list", () => {
    expect(planPageAnnotations([])).toEqual([]);
  });
});

describe("buildReportSummary", () => {
  it("flags a report as partial when fewer tests are reported than ordered", () => {
    const summary = buildReportSummary(3, 1);
    expect(summary.isPartial).toBe(true);
    expect(summary.label).toBe("Partial Report — 1 of 3 test(s) included");
  });

  it("flags a report as final once every ordered test is reported", () => {
    const summary = buildReportSummary(3, 3);
    expect(summary.isPartial).toBe(false);
    expect(summary.label).toBe("Final Report — all tests included");
  });

  it("treats a single-test order's one report as final, not partial", () => {
    const summary = buildReportSummary(1, 1);
    expect(summary.isPartial).toBe(false);
  });
});
