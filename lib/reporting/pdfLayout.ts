export interface ReportPageInput {
  pageNumber: number;
  testName: string;
}

export interface PageAnnotationPlan {
  pageNumber: number;
  testName: string;
  showAddressFooter: boolean;
  showElectronicIssuedStatement: boolean;
}

/**
 * Every physical page gets the address footer and the electronically-issued
 * statement, regardless of which test it belongs to or whether it is the
 * last page in the document. This replaces the old `isLastTest`-gated logic
 * that only wrote these once, at the end of the combined PDF.
 */
export function planPageAnnotations(pages: ReportPageInput[]): PageAnnotationPlan[] {
  return pages.map((page) => ({
    pageNumber: page.pageNumber,
    testName: page.testName,
    showAddressFooter: true,
    showElectronicIssuedStatement: true,
  }));
}

export interface ReportSummary {
  isPartial: boolean;
  label: string;
}

/**
 * Determines whether a generated report covers every test on the order, and
 * the label to render on it. Used to stop a 1-of-3 report from silently
 * looking identical to a final one.
 */
export function buildReportSummary(totalTests: number, reportedTests: number): ReportSummary {
  const isPartial = reportedTests < totalTests;
  return {
    isPartial,
    label: isPartial
      ? `Partial Report — ${reportedTests} of ${totalTests} test(s) included`
      : "Final Report — all tests included",
  };
}
