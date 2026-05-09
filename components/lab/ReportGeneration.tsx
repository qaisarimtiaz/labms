'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TestResult {
  _id: string;
  testOrder: {
    _id: string;
    orderNumber: string;
    patient: {
      _id: string;
      firstName: string;
      lastName: string;
      patientId: string;
      email: string;
      dateOfBirth: string;
      gender: string;
      phone: string;
    };
    referredByDoctor?: string;
    createdAt: string;
    priority: string;
  };
  test: {
    _id: string;
    code: string;
    name: string;
    category: string;
    normalRange?: string;
    reportFormat?: string;
    type?: string;
  };
  resultData: {
    parameter: string;
    value: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  overallStatus: 'normal' | 'abnormal' | 'critical';
  comments: string;
  testedDate: string;
  status: 'pending' | 'approved';
}

interface GroupedResults {
  [orderId: string]: {
    orderInfo: TestResult['testOrder'];
    results: TestResult[];
  };
}

export default function ReportGeneration() {
  const [pendingResults, setPendingResults] = useState<TestResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<GroupedResults>({});
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPendingResults();
  }, []);

  useEffect(() => {
    // Group results by order
    const grouped: GroupedResults = {};
    pendingResults.forEach(result => {
      // Add null checks to prevent errors
      if (!result || !result.testOrder || !result.testOrder._id) {
        console.warn('Invalid result data:', result);
        return;
      }
      
      
      const orderId = result.testOrder._id;
      if (!grouped[orderId]) {
        grouped[orderId] = {
          orderInfo: result.testOrder,
          results: []
        };
      }
      grouped[orderId].results.push(result);
    });
    setGroupedResults(grouped);
  }, [pendingResults]);

  const fetchPendingResults = async () => {
    try {
      setLoading(true);
      
      // Get all in-progress orders with populated patient data (same as WorkQueue)
      const ordersResponse = await fetch('/api/orders?orderStatus=in_progress');
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const ordersData = await ordersResponse.json();
      const inProgressOrders = ordersData.orders || [];
      
      
      // Then get results for these orders
      const allResults = [];
      for (const order of inProgressOrders) {
        try {
          const resultsResponse = await fetch(`/api/results?testOrderId=${order._id}`);
          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json();
            const orderResults = resultsData.results || [];
            
            // Attach the complete order info (including populated patient) to each result
            orderResults.forEach((result: Partial<TestResult>) => {
              result.testOrder = order; // Use the complete order object with populated patient
            });
            
            allResults.push(...orderResults);
          }
        } catch (error) {
          console.warn(`Failed to fetch results for order ${order._id}:`, error);
        }
      }
      
      setPendingResults(allResults);
      
    } catch (error) {
      console.error('Error fetching pending results:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (orderId: string) => {
    const orderResults = groupedResults[orderId];
    if (!orderResults) return;

    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = (await import('jspdf'));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const a4Width = 210;
      const margin = 15;
      const contentWidth = a4Width - (margin * 2);

      const renderPageInIframe = (html: string): Promise<HTMLCanvasElement> => {
        return new Promise((resolve, reject) => {
          const div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.left = '-9999px';
          div.style.width = '210mm';
          div.style.padding = '15mm';
          div.style.backgroundColor = '#ffffff';
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
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span><span style="font-weight: 500;">Patient Name:</span><span style="margin-left: 8px;">${`${orderResults.orderInfo?.patient?.firstName || ''} ${orderResults.orderInfo?.patient?.lastName || ''}`.trim().toUpperCase()}</span></span><span><span style="font-weight: 500;">Patient ID:</span><span style="margin-left: 8px;">${orderResults.orderInfo?.patient?.patientId || 'N/A'}</span></span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span><span style="font-weight: 500;">Gender:</span><span style="margin-left: 8px;">${orderResults.orderInfo?.patient?.gender ? (orderResults.orderInfo.patient.gender.toLowerCase() === 'male' ? 'Male' : orderResults.orderInfo.patient.gender.toLowerCase() === 'female' ? 'Female' : 'Other') : '-'}</span></span><span><span style="font-weight: 500;">Age:</span><span style="margin-left: 8px;">${orderResults.orderInfo?.patient?.dateOfBirth ? `${calculateAge(orderResults.orderInfo.patient.dateOfBirth)} Years` : 'N/A'}</span></span><span><span style="font-weight: 500;">Date of Sample Collection:</span><span style="margin-left: 8px;">${new Date(orderResults.orderInfo.createdAt).toLocaleDateString('en-GB')}</span></span></div>
            <div style="display: flex; justify-content: space-between;"><span><span style="font-weight: 500;">Referred by Dr:</span><span style="margin-left: 8px;">${orderResults.orderInfo?.referredByDoctor || '-'}</span></span><span><span style="font-weight: 500;">Contact No:</span><span style="margin-left: 8px;">${orderResults.orderInfo?.patient?.phone || '-'}</span></span></div>
          </div>
        </div>
      `;

      const reportHeaderHTML = `
        <div style="border-bottom: 4px solid #000; margin-bottom: 12px;"></div>
        <div style="width: 100%; margin-bottom: 12px;">
          <img src="/logo.jpeg" alt="Health Inn Services" style="width: 100%; height: auto; display: block;" />
        </div>
        <div style="text-align: center; margin-bottom: 16px; background-color: #000; color: #fff; padding: 14px 0;"><h1 style="font-size: 22px; font-weight: bold; margin: 0;">LABORATORY TEST REPORT</h1></div>
        <div style="text-align: right; margin-bottom: 16px; font-size: 14px;"><span style="font-weight: 500;">Date: ${new Date(orderResults.orderInfo.createdAt).toLocaleDateString('en-GB')}</span></div>
      `;

      const reportFooterHTML = `
        <div style="border-bottom: 2px solid #666; margin: 8px 0 4px 0;"></div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;"><p style="text-align: center; margin-bottom: 4px; margin-top: 0;">Electronically issued test report duly verified by pathologist, no signature required.</p><p style="text-align: center; color: #888; margin: 0;">Office No. 101, Building No. 60-C, Zulfiqar Commercial Street No. 04, Phase VIII DHA, Karachi, Pakistan</p></div>
      `;

      for (let i = 0; i < orderResults.results.length; i++) {
        const result = orderResults.results[i];
        const isLastTest = i === orderResults.results.length - 1;
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
                  result.resultData.map(param => `<tr style="border-bottom: 1px solid #ccc;"><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.parameter}</td><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.value}</td><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.unit || '-'}</td><td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${param.normalRange || '-'}</td></tr>`).join('')
                  : '<tr><td colspan="4" style="border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 12px;">No results available</td></tr>'
                }
              </tbody>
            </table>
          </div>
        `;

        if (result.comments) {
          testResultHTML += `<div style="margin-top: 8px; font-size: 12px;"><p><span style="font-weight: 500;">Comments:</span> ${result.comments}</p></div>`;
        }

        let pageHTML = reportHeaderHTML;
        if (i === 0) {
          pageHTML += patientInfoHTML;
        }
        pageHTML += testResultHTML;
        if (isLastTest) {
          pageHTML += reportFooterHTML;
        }

        const canvas = await renderPageInIframe(pageHTML);
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight > 297 - (margin*2) ? 297 - (margin*2) : imgHeight);
      }

      const pdfDataUri = pdf.output('dataurlstring');
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `Lab_Report_${orderResults.orderInfo.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ... (rest of the logic remains the same)
      try {
        await Promise.all(orderResults.results.map(async (result) => {
          if (result._id) {
            const response = await fetch(`/api/results/${result._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'approved' })
            });
            if (!response.ok) {
              console.warn(`Failed to update result ${result._id}`);
            }
          }
        }));
      } catch (error) {
        console.warn('Failed to update some results:', error);
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: 'completed',
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        try {
          const emailResponse = await fetch('/api/notifications/report-ready', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              orderNumber: orderResults.orderInfo.orderNumber,
              patient: orderResults.orderInfo.patient,
              reportGeneratedDate: new Date().toLocaleDateString()
            })
          });

          if (emailResponse.ok) {
            alert('Report generated successfully and notification email sent to patient!');
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }

        fetchPendingResults();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };


  const getStatusColor = (status: string) => {
    const colors = {
      normal: 'text-green-600 bg-green-100',
      abnormal: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedOrderData = selectedOrder ? groupedResults[selectedOrder] : null;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Report Generation</h3>
            <p className="text-sm text-muted-foreground">Generate professional PDF reports from completed test results</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPendingResults}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {Object.keys(groupedResults).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No results ready for reporting</h3>
            <p className="text-sm text-gray-500">Complete test result entries first to generate reports.</p>
          </div>
        ) : (
          /* Orders Grid View */
          <div className="grid gap-4">
            {Object.entries(groupedResults).map(([orderId, orderData]) => {
              // Add null safety checks
              if (!orderData || !orderData.orderInfo || !orderData.results) {
                console.warn('Invalid order data:', orderData);
                return null;
              }

              const { orderInfo, results } = orderData;
              
              return (
                <div key={orderId} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">#{orderInfo?.orderNumber || 'N/A'}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Patient</p>
                          <p className="font-medium text-gray-900">
                            {orderInfo?.patient ? 
                              `${orderInfo.patient.firstName} ${orderInfo.patient.lastName}` :
                              'Patient Name Not Available'
                            }
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium text-gray-900">
                            {orderInfo?.createdAt ? new Date(orderInfo.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Test Results ({results?.length || 0})</p>
                        <div className="grid gap-2">
                          {results?.map((result) => {
                            if (!result || !result._id) return null;
                            
                            return (
                              <div key={result._id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-gray-900">{result.test?.name || 'Unknown Test'}</p>
                                    <p className="text-sm text-gray-600">({result.test?.code || 'N/A'})</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.overallStatus || 'normal')}`}>
                                    {(result.overallStatus || 'normal').toUpperCase()}
                                  </span>
                                </div>
                                
                                <div className="mt-2 text-xs text-gray-600">
                                  Parameters: {result.resultData?.length || 0}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  </div>

                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedOrder(selectedOrder === orderId ? null : orderId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors duration-200 w-auto"
                    >
                      {selectedOrder === orderId ? 'Hide Preview' : 'Preview Report'}
                    </button>
                    
                    <button
                      onClick={() => generateReport(orderId)}
                      disabled={generating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
                    >
                      {generating ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate PDF
                        </>
                      )}
                    </button>
                    </div>
                  </div>

                  {/* Expanded Preview */}
                  {selectedOrder === orderId && selectedOrderData && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <div className="bg-white border rounded-lg p-8 w-full" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {/* Top Border Line */}
                      <div className="border-b-4 border-gray-800 mb-4"></div>

                      {/* Report Header */}
                      <div className="w-full mb-3">
                        <Image src="/logo.jpeg" alt="Health Inn Services" style={{ width: '100%', height: 'auto' }} width={4456} height={594} />
                      </div>

                      {/* Center Title */}
                      <div className="text-center mb-4 bg-black text-white py-3">
                        <h1 className="text-xl font-bold">LABORATORY TEST REPORT</h1>
                      </div>

                      {/* Date on right side */}
                      <div className="text-right mb-4 text-sm">
                        <span className="font-medium">Date: {new Date(selectedOrderData.orderInfo.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>

                      {/* Patient Info Box */}
                      <div className="border-2 border-gray-400 p-4 mb-4">
                        <h2 className="font-bold text-gray-900 mb-3 text-center text-sm">PATIENT INFORMATION</h2>
                        <div className="text-sm space-y-1.5">
                          <div className="flex justify-between">
                            <span>
                              <span className="font-medium">Patient Name:</span>
                              <span className="ml-2">
                                {selectedOrderData.orderInfo?.patient?.firstName || selectedOrderData.orderInfo?.patient?.lastName ?
                                  `${selectedOrderData.orderInfo.patient.firstName || ''} ${selectedOrderData.orderInfo.patient.lastName || ''}`.trim().toUpperCase() :
                                  'N/A'
                                }
                              </span>
                            </span>
                            <span>
                              <span className="font-medium">Patient ID:</span>
                              <span className="ml-2">{selectedOrderData.orderInfo?.patient?.patientId || 'N/A'}</span>
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              <span className="font-medium">Gender:</span>
                              <span className="ml-2">
                                {selectedOrderData.orderInfo?.patient?.gender ? (
                                  selectedOrderData.orderInfo.patient.gender.toLowerCase() === 'male' ? 'Male' :
                                  selectedOrderData.orderInfo.patient.gender.toLowerCase() === 'female' ? 'Female' :
                                  selectedOrderData.orderInfo.patient.gender.toLowerCase() === 'other' ? 'Other' :
                                  '-'
                                ) : '-'}
                              </span>
                            </span>
                            <span>
                              <span className="font-medium">Age:</span>
                              <span className="ml-2">
                                {selectedOrderData.orderInfo?.patient?.dateOfBirth ?
                                  `${calculateAge(selectedOrderData.orderInfo.patient.dateOfBirth)} Years` :
                                  'N/A'
                                }
                              </span>
                            </span>
                            <span>
                              <span className="font-medium">Date of Sample Collection:</span>
                              <span className="ml-2">{new Date(selectedOrderData.orderInfo.createdAt).toLocaleDateString('en-GB')}</span>
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              <span className="font-medium">Referred by Dr:</span>
                              <span className="ml-2">{selectedOrderData.orderInfo?.referredByDoctor || '-'}</span>
                            </span>
                            <span>
                              <span className="font-medium">Contact No:</span>
                              <span className="ml-2">{selectedOrderData.orderInfo?.patient?.phone || '-'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Test Results */}
                      <div className="mb-6">
                        {selectedOrderData.results.map((result, index) => (
                          <div key={result._id} className={`mb-8 ${index > 0 ? 'print:break-before-page' : ''}`}>
                            {/* Test Type Display */}
                            {result.test?.type && (
                              <div className="text-center mb-2 text-xs font-semibold text-gray-600">
                                {result.test.type.replace(/-/g, ' ').toUpperCase()}
                              </div>
                            )}
                            <h4 className="font-bold text-gray-900 mb-4 text-center text-sm">{result.test.name} ({result.test.code})</h4>

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
                        ))}
                      </div>

                      {/* Bottom Line and Footer */}
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}