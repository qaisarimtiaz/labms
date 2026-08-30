'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface TestOrder {
  _id: string;
  orderNumber: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  tests: {
    _id: string;
    code: string;
    name: string;
    price?: number;
  }[];
  orderStatus: 'completed' | 'partially_reported';
  priority: 'normal' | 'urgent' | 'stat';
  referredByDoctor?: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  createdAt: string;
  completedAt?: string;
  sampleCollectionDate?: string;
  expectedReportDate?: string;
  notes?: string;
  reportPDF?: Buffer;
}

interface TestResult {
  _id: string;
  test?: {
    name?: string;
    code?: string;
    reportFormat?: string;
    type?: string;
  };
  overallStatus?: 'normal' | 'abnormal' | 'critical';
  resultData?: {
    parameter?: string;
    value?: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  comments?: string;
}

const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function CompletedTests() {
  const [completedOrders, setCompletedOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'stat'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 20;

  // Results view modal states
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [viewingResults, setViewingResults] = useState<TestResult[]>([]);
  const [viewingOrder, setViewingOrder] = useState<TestOrder | null>(null);

  const fetchCompletedOrders = useCallback(async (page = 1, search = '', priority: 'all' | 'normal' | 'urgent' | 'stat' = 'all') => {
    try {
      setLoading(true);

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: ordersPerPage.toString(),
        // Partially-reported orders belong here too — reception needs to be
        // able to print and hand over whichever tests are ready, even
        // before every test on the order is done.
        orderStatus: 'completed,partially_reported',
        ...(search && { search }),
        ...(priority !== 'all' && { priority })
      });

      const response = await fetch(`/api/orders?${searchParams}`);
      if (response.ok) {
        const data = await response.json();
        setCompletedOrders(data.orders || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalOrders(data.pagination?.total || 0);
        setCurrentPage(page);
      } else {
        console.error('Failed to fetch completed orders');
      }
    } catch (error) {
      console.error('Error fetching completed orders:', error);
    } finally {
      setLoading(false);
    }
  }, [ordersPerPage]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCompletedOrders(1, searchTerm, priorityFilter);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, priorityFilter, fetchCompletedOrders]);

  const handlePageChange = (page: number) => {
    fetchCompletedOrders(page, searchTerm, priorityFilter);
  };

  const viewResults = async (orderId: string) => {
    try {
      // Find the order from the completed orders list
      const order = completedOrders.find(o => o._id === orderId);
      if (!order) return;

      // Fetch results for this order
      const resultsResponse = await fetch(`/api/results?testOrderId=${orderId}`);
      let results: TestResult[] = [];
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        results = resultsData.results || [];
      }

      // Set the viewing states
      setViewingOrderId(orderId);
      setViewingOrder(order);
      setViewingResults(results);
    } catch (error) {
      console.error('Error loading results:', error);
      alert('Failed to load results');
    }
  };

  const downloadReport = async (orderId: string, orderNumber: string) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = (await import('jspdf'));

      const [orderRes, resultsRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch(`/api/results?testOrderId=${orderId}`)
      ]);

      if (!orderRes.ok || !resultsRes.ok) {
        throw new Error('Failed to fetch order data');
      }

      const orderData = await orderRes.json();
      const resultsData = await resultsRes.json();
      const order = orderData.order;
      const results = resultsData.results || [];

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const a4Width = 210;
      const a4Height = 297;

      const renderPageInIframe = (html: string): Promise<HTMLCanvasElement> => {
        return new Promise((resolve, reject) => {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.left = '-9999px';
          // border-box makes the div's rendered size exactly 210mm x >=297mm —
          // a full A4 page with its 15mm padding acting as the page margin —
          // so the captured canvas maps 1:1 onto the PDF page with no separate
          // margin/ratio math needed, and a short page still fills the page
          // height (pinning the footer to the true bottom via margin-top:auto).
          div.style.boxSizing = 'border-box';
          div.style.width = '210mm';
          div.style.minHeight = '297mm';
          div.style.padding = '15mm';
          div.style.backgroundColor = '#ffffff';
          div.style.display = 'flex';
          div.style.flexDirection = 'column';
          div.innerHTML = html;
          document.body.appendChild(div);

          // Wait for images to load
          setTimeout(async () => {
            try {
              const canvas = await html2canvas(div, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: true
              });
              document.body.removeChild(div);
              resolve(canvas);
            } catch (error) {
              document.body.removeChild(div);
              reject(error);
            }
          }, 500);
        });
      };

      const patientInfoHTML = `
        <div style="border: 2px solid #ccc; padding: 16px; margin-bottom: 16px;">
          <h2 style="font-weight: bold; color: #111; margin-bottom: 12px; text-align: center; font-size: 14px;">PATIENT INFORMATION</h2>
          <div style="font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span><span style="font-weight: 500;">Patient Name:</span><span style="margin-left: 8px;">${
`${order.patient?.firstName || ''} ${order.patient?.lastName || ''}`.trim().toUpperCase()}</span></span><span><span style="font-weight: 500;">Patient ID:</span><span style="margin-left: 8px;">${order.patient?.patientId || 'N/A'}</span></span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span><span style="font-weight: 500;">Gender:</span><span style="margin-left: 8px;">${order.patient?.gender ? order.patient.gender.toUpperCase() : 'N/A'}</span></span><span><span style="font-weight: 500;">Age:</span><span style="margin-left: 8px;">${order.patient?.dateOfBirth ? `${calculateAge(order.patient.dateOfBirth)} Years` : 'N/A'}</span></span><span><span style="font-weight: 500;">Date of Sample Collection:</span><span style="margin-left: 8px;">${new Date(order.createdAt).toLocaleDateString('en-GB')}</span></span></div>
            <div style="display: flex; justify-content: space-between;"><span><span style="font-weight: 500;">Referred by Dr:</span><span style="margin-left: 8px;">${order.referredByDoctor || '-'}</span></span><span><span style="font-weight: 500;">Contact No:</span><span style="margin-left: 8px;">${order.patient?.phone || '-'}</span></span></div>
          </div>
        </div>
      `;

      const reportHeaderHTML = `
        <div style="border-bottom: 4px solid #000; margin-bottom: 16px;"></div>
        <div style="width: 100%; margin-bottom: 12px;"><img src="/Full_logo.jpg" alt="Health Inn Services" style="width: 100%; height: auto; display: block;" /></div>
        <div style="text-align: center; margin-bottom: 16px; background-color: #000; color: #fff; padding: 8px 0;"><h1 style="font-size: 16px; font-weight: bold; margin: 0;">LABORATORY TEST REPORT</h1></div>
        <div style="text-align: right; margin-bottom: 16px; font-size: 14px;"><span style="font-weight: 500;">Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}</span></div>
      `;

      // Rendered on every physical page, letterhead-style — not gated on
      // being the last test in the combined document.
      const reportFooterHTML = `
        <div style="border-bottom: 2px solid #666; margin: 8px 0 4px 0;"></div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;"><p style="text-align: center; margin-bottom: 4px; margin-top: 0;">Electronically issued test report duly verified by pathologist, no signature required.</p><p style="text-align: center; color: #888; margin: 0;">Office No. 101, Building No. 60-C, Zulfiqar Commercial Street No. 04, Phase VIII DHA, Karachi, Pakistan</p></div>
      `;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        let testResultHTML = '';

        if (result.test?.type) {
          testResultHTML += `<div style="text-align: center; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: #666;">${result.test.type.replace(/-/g, ' ').toUpperCase()}</div>`;
        }

        testResultHTML += `
          <h4 style="font-weight: bold; color: #111; margin-bottom: 16px; text-align: center; font-size: 14px;">${result.test.name} (${result.test.code})</h4>
          <div style="overflow-x: auto; width: 100%; margin-bottom: 16px;">
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
              <thead><tr style="background-color: #fff; border-top: 2px solid #000; border-bottom: 2px solid #000;"><th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold; font-size: 12px;">PARAMETER</th><th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold; font-size: 12px;">RESULT</th><th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold; font-size: 12px;">UNIT</th><th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-weight: bold; font-size: 12px;">REFERENCE RANGE</th></tr></thead>
              <tbody>
                ${result.resultData && result.resultData.length > 0 ?
                  result.resultData.map((param: { parameter?: string; value?: string; unit?: string; normalRange?: string; }) => `<tr style="border-bottom: 1px solid #ccc;"><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.parameter}</td><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.value}</td><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.unit || '-'}</td><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.normalRange || '-'}</td></tr>`).join('')
                  : '<tr><td colspan="4" style="border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 12px;">No results available</td></tr>'
                }
              </tbody>
            </table>
          </div>
        `;

        if (result.comments) {
          testResultHTML += `<div style="margin-top: 8px; font-size: 12px;"><p><span style="font-weight: 500;">Comments:</span> ${result.comments}</p></div>`;
        }

        // Patient info repeats on every test's page, not just the first.
        let pageHTML = reportHeaderHTML;
        pageHTML += patientInfoHTML;
        pageHTML += testResultHTML;
        pageHTML += `<div style="margin-top: auto;">${reportFooterHTML}</div>`;

        const canvas = await renderPageInIframe(pageHTML);
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const imgHeight = (canvas.height * a4Width) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, a4Width, imgHeight > a4Height ? a4Height : imgHeight);
      }

      const pdfDataUri = pdf.output('dataurlstring');
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `Lab_Report_${orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      stat: 'text-red-600 bg-red-100',
      urgent: 'text-orange-600 bg-orange-100',
      normal: 'text-gray-600 bg-gray-100'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Completed Tests</h3>
            <p className="text-sm text-muted-foreground">View and download reports for completed and partially reported lab orders</p>
          </div>
          <button
            onClick={() => fetchCompletedOrders()}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search orders, patients, tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'normal' | 'urgent' | 'stat')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Priorities</option>
              <option value="stat">🚨 STAT Only</option>
              <option value="urgent">⚡ Urgent Only</option>
              <option value="normal">Normal Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order & Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tests Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {completedOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 text-sm">#{order.orderNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                          {order.priority.toUpperCase()}
                        </span>
                        {order.orderStatus === 'partially_reported' ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            PARTIALLY REPORTED
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            COMPLETED
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.patient?.firstName || 'N/A'} {order.patient?.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.orderStatus === 'partially_reported'
                          ? `Ordered: ${new Date(order.createdAt).toLocaleDateString()}`
                          : `Completed: ${order.completedAt ? new Date(order.completedAt).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {order.orderStatus === 'partially_reported'
                          ? `${order.tests?.length || 0} test(s) on order — not all reported yet`
                          : `${order.tests?.length || 0} test(s) completed`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {order.tests?.slice(0, 2).map(test => test.name).join(', ')}
                        {(order.tests?.length || 0) > 2 && ` +${(order.tests?.length || 0) - 2} more`}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => viewResults(order._id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Results
                      </button>

                      <button
                        onClick={() => downloadReport(order._id, order.orderNumber)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {completedOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No completed tests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No completed tests match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing page {currentPage} of {totalPages} ({totalOrders} total orders)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  let page;
                  if (totalPages <= 5) {
                    page = index + 1;
                  } else if (currentPage <= 3) {
                    page = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + index;
                  } else {
                    page = currentPage - 2 + index;
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        currentPage === page
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{completedOrders.length}</span> orders on this page
            </span>
            <span className="text-muted-foreground">
              Total tests: <span className="font-semibold text-foreground">
                {completedOrders.reduce((sum, order) => sum + (order.tests?.length || 0), 0)}
              </span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Results View Modal */}
      {viewingOrderId && viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order #{viewingOrder.orderNumber}</h3>
                <p className="text-sm text-gray-600">{viewingOrder.patient?.firstName} {viewingOrder.patient?.lastName}</p>
              </div>
              <button
                onClick={() => setViewingOrderId(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content - Report Style */}
            <div className="p-8 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="bg-white border rounded-lg p-8" style={{ fontFamily: 'Arial, sans-serif', minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
                {/* Top Border Line */}
                <div className="border-b-4 border-gray-800 mb-4"></div>

                {/* Report Header */}
                <div className="w-full mb-4">
                  <Image src="/Full_logo.jpg" alt="Health Inn Services" style={{ width: '100%', height: 'auto' }} width={4456} height={594} />
                </div>

                {/* Center Title */}
                <div className="text-center mb-4 bg-black text-white py-2">
                  <h1 className="text-base font-bold">LABORATORY TEST REPORT</h1>
                </div>

                {/* Date on right side */}
                <div className="text-right mb-4 text-sm">
                  <span className="font-medium">Date: {new Date(viewingOrder.createdAt).toLocaleDateString('en-GB')}</span>
                </div>

                {/* Patient Info Box */}
                <div className="border-2 border-gray-400 p-4 mb-4">
                  <h2 className="font-bold text-gray-900 mb-2 text-center text-sm">PATIENT INFORMATION</h2>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>
                        <span className="font-medium">Patient Name:</span>
                        <span className="ml-2">{`${viewingOrder.patient?.firstName || ''} ${viewingOrder.patient?.lastName || ''}`.toUpperCase()}</span>
                      </span>
                      <span>
                        <span className="font-medium">Patient ID:</span>
                        <span className="ml-2">{viewingOrder.patient?.patientId || 'N/A'}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        <span className="font-medium">Gender:</span>
                        <span className="ml-2">
                          {viewingOrder.patient?.gender ? (
                            viewingOrder.patient.gender.toLowerCase() === 'male' ? 'Male' :
                            viewingOrder.patient.gender.toLowerCase() === 'female' ? 'Female' :
                            viewingOrder.patient.gender.toLowerCase() === 'other' ? 'Other' :
                            '-'
                          ) : '-'}
                        </span>
                      </span>
                      <span>
                        <span className="font-medium">Age:</span>
                        <span className="ml-2">
                          {viewingOrder.patient?.dateOfBirth ?
                            `${calculateAge(viewingOrder.patient.dateOfBirth)} Years` :
                            'N/A'
                          }
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        <span className="font-medium">Date of Sample Collection:</span>
                        <span className="ml-2">{new Date(viewingOrder.createdAt).toLocaleDateString('en-GB')}</span>
                      </span>
                      <span>
                        <span className="font-medium">Contact No:</span>
                        <span className="ml-2">{viewingOrder.patient?.phone || '-'}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        <span className="font-medium">Referred by Dr:</span>
                        <span className="ml-2">{viewingOrder.referredByDoctor || '-'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Test Results */}
                <div className="mb-6">
                  {viewingResults && viewingResults.length > 0 ? (
                    viewingResults.map((result, index) => (
                      <div key={result._id} className={`mb-8 ${index > 0 ? 'print:break-before-page' : ''}`}>
                        {/* Test Type Display */}
                        {result.test?.type && (
                          <div className="text-center mb-2 text-xs font-semibold text-gray-600">
                            {result.test.type.replace(/-/g, ' ').toUpperCase()}
                          </div>
                        )}
                        <h4 className="font-bold text-gray-900 mb-4 text-center text-sm">{result.test?.name} ({result.test?.code})</h4>

                        <div className="overflow-x-auto w-full mb-4">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-white border-t-2 border-b-2 border-black">
                                <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">PARAMETER</th>
                                <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">RESULT</th>
                                <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">UNIT</th>
                                <th className="border border-gray-300 px-2 py-1 text-left font-bold text-xs">REFERENCE RANGE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.resultData && result.resultData.length > 0 ? (
                                result.resultData.map((param, paramIndex) => (
                                  <tr key={paramIndex} className="border-b border-gray-300">
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{param.parameter}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{param.value}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{param.unit || '-'}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{param.normalRange || '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-center text-xs">No results available</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {result.comments && (
                          <div className="mt-2 text-xs">
                            <p><span className="font-medium">Comments:</span> {result.comments}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-600">No results found</p>
                  )}
                </div>

                {/* Bottom Line and Footer — margin-top:auto pins this to the
                    bottom of the min-height:297mm container above, regardless
                    of how little content precedes it */}
                <div style={{ marginTop: 'auto' }}>
                  <div className="border-b-2 border-gray-700 my-4"></div>

                  {/* Footer with Verification */}
                  <div className="text-xs text-gray-700">
                    <p className="text-center mb-2">
                      Electronically issued test report duly verified by pathologist, no signature required.
                    </p>
                    <p className="text-center text-gray-600">
                      Office No. 101, Building No. 60-C, Zulfiqar Commercial Street No. 04, Phase VIII DHA, Karachi, Pakistan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => downloadReport(viewingOrder._id, viewingOrder.orderNumber)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Download PDF
              </button>
              <button
                onClick={() => setViewingOrderId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
