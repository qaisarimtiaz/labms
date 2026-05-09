'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OrderReceipt from '@/components/reception/OrderReceipt';

interface TestOrder {
  _id: string;
  orderNumber: string;
  patient: {
    _id?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  tests: Array<{
    name: string;
    code: string;
    price: number;
    description?: string;
  }>;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card';
  sampleCollectionDate?: string;
  expectedReportDate?: string;
  priority: 'normal' | 'urgent' | 'stat';
  createdAt: string;
  createdBy?: string;
  patientEmail?: string;
  patientPassword?: string;
}

function ReceiptPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('0');
  const [savingDiscount, setSavingDiscount] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDiscount = async () => {
    if (!orderId) return;

    const discountPercentage = parseFloat(discountInput) || 0;
    if (discountPercentage < 0 || discountPercentage > 100) {
      alert('Discount percentage must be between 0 and 100');
      return;
    }

    setSavingDiscount(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/discount`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount: discountPercentage })
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setShowDiscountModal(false);
        setDiscountInput('0');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to save discount');
      }
    } catch (err) {
      console.error('Error saving discount:', err);
      alert('Failed to save discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }


    try {
      setLoading(true);
      // Try the receipt endpoint first, fall back to orders endpoint
      let response = await fetch(`/api/receipt/${orderId}`);

      if (!response.ok) {
        response = await fetch(`/api/orders/${orderId}`);
      }


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Failed to fetch order details (${response.status})`);
      }

      const data = await response.json();

      // Add patient email and password from order if available
      if (!data.order.patient.email && data.order.patientEmail) {
        data.order.patient.email = data.order.patientEmail;
      }
      if (!data.order.patientPassword && data.order.patientPassword) {
        // Already set
      } else if (data.order.patientPassword) {
        // Already set
      }

      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Receipt Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested receipt could not be found.'}</p>
        </div>
      </div>
    );
  }

  const orderData = {
    orderNumber: order.orderNumber,
    patientName: `${order.patient.firstName} ${order.patient.lastName}`,
    patientPhone: order.patient.phone,
    patientEmail: order.patient.email,
    patientPassword: order.patientPassword,
    tests: order.tests,
    totalAmount: order.totalAmount,
    paidAmount: order.paidAmount,
    discount: order.discount || 0,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    sampleCollectionDate: order.sampleCollectionDate,
    expectedReportDate: order.expectedReportDate,
    createdAt: order.createdAt,
    priority: order.priority,
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Print and Discount Buttons */}
        <div className="mb-6 flex justify-between items-center print-hide">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Receipt</h1>
            <p className="text-gray-600">Order #{order.orderNumber}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setDiscountInput(order.discount?.toString() || '0');
                setShowDiscountModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Discount
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt
            </button>
          </div>
        </div>

        {/* Receipt Component */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden receipt-container">
          <OrderReceipt ref={receiptRef} orderData={orderData} />
        </div>

        {/* Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Set Discount</h3>
                  <button
                    onClick={() => setShowDiscountModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>

                {order && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Total:</span>
                        <span className="font-medium">Rs. {Math.round(order.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      {(parseFloat(discountInput) || 0) > 0 && (
                        <>
                          <div className="flex justify-between text-red-600">
                            <span>Discount ({discountInput}%):</span>
                            <span>-Rs. {Math.round(((order.totalAmount || 0) * (parseFloat(discountInput) || 0)) / 100).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                            <span className="text-gray-700">Final Total:</span>
                            <span>Rs. {Math.round((order.totalAmount || 0) - (((order.totalAmount || 0) * (parseFloat(discountInput) || 0)) / 100)).toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDiscount}
                    disabled={savingDiscount}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDiscount ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </div>
                    ) : (
                      'Save Discount'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    }>
      <ReceiptPageContent />
    </Suspense>
  );
}