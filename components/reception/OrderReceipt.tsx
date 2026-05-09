'use client';

import { forwardRef, useState, useEffect } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface ReceiptProps {
  orderData: {
    orderNumber: string;
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    patientPassword?: string;
    tests: Array<{
      name: string;
      code: string;
      price: number;
      description?: string;
    }>;
    totalAmount: number;
    paidAmount: number;
    discount: number;
    paymentStatus: string;
    paymentMethod?: string;
    sampleCollectionDate?: string;
    expectedReportDate?: string;
    createdAt: string;
    priority: string;
  };
}

const OrderReceipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ orderData }, ref) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

    // Generate QR code on mount
    useEffect(() => {
      const generateQRCode = async () => {
        try {
          const url = await QRCode.toDataURL('https://healthinnlab.vercel.app/');
          setQrCodeUrl(url);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      };
      generateQRCode();
    }, []);

    // Helper function to calculate discount amount
    const calculateDiscountAmount = () => {
      const subtotal = orderData.totalAmount || 0;
      const discountPercent = orderData.discount || 0;
      return Math.round((subtotal * discountPercent) / 100);
    };

    // Helper function to calculate final total after discount
    const calculateFinalTotal = () => {
      const subtotal = orderData.totalAmount || 0;
      const discountAmount = calculateDiscountAmount();
      return Math.round(subtotal - discountAmount);
    };

    // Helper function to calculate balance/outstanding amount
    const calculateBalance = () => {
      const finalTotal = calculateFinalTotal();
      const paidAmount = orderData.paidAmount || 0;
      return Math.round(finalTotal - paidAmount);
    };

    return (
      <div ref={ref} className="max-w-sm mx-auto bg-white p-4 text-black font-mono border border-gray-300" style={{ width: '80mm', minHeight: '200mm', fontSize: '16.8px' }}>
        {/* Header - Pakistani shop style */}
        <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-3">
          <div className="flex justify-center mb-2 w-full">
            <Image
              src="/Full_logo.jpg"
              alt="Health Inn Services"
              width={200}
              height={80}
              className="object-contain w-full h-auto"
            />
          </div>
          <div className="font-bold uppercase mt-2" style={{ fontSize: '14.4px' }}>Health Inn Services</div>
          <div className="font-bold" style={{ fontSize: '14.4px' }}>Karachi Pakistan</div>
          <div className="mt-1 leading-tight" style={{ fontSize: '14.4px' }}>
            <div className="font-semibold">DHA Phase-8</div>
            <div className="mt-1">Mobile: 021 35246892</div>
          </div>
          <div className="mt-2 font-bold uppercase border-t border-dashed border-gray-400 pt-2" style={{ fontSize: '14.4px' }}>
            Receipt
          </div>
        </div>

        {/* Basic Info */}
        <div className="mb-3" style={{ fontSize: '14.4px' }}>
          <div className="flex justify-between">
            <span>Order #:</span>
            <span>{orderData.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(orderData.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Patient:</span>
            <span>{orderData.patientName}</span>
          </div>
          {orderData.patientPhone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{orderData.patientPhone}</span>
            </div>
          )}
        </div>

        {/* Login Credentials */}
        {(orderData.patientEmail || orderData.patientPassword) && (
          <div className="mb-3 border-t border-dashed border-gray-400 pt-2">
            <div className="font-semibold mb-1" style={{ fontSize: '14.4px' }}>Login Credentials:</div>
            {orderData.patientEmail && (
              <div className="flex justify-between font-mono" style={{ fontSize: '14.4px' }}>
                <span>Email:</span>
                <span>{orderData.patientEmail}</span>
              </div>
            )}
            {orderData.patientPassword && (
              <div className="flex justify-between font-mono" style={{ fontSize: '14.4px' }}>
                <span>Password:</span>
                <span>{orderData.patientPassword}</span>
              </div>
            )}
          </div>
        )}

        {/* Tests List - Simple format */}
        <div className="mb-4">
          <div className="border-b border-dashed border-gray-400 mb-2 pb-1">
            <div className="flex justify-between font-semibold" style={{ fontSize: '14.4px' }}>
              <span>Item</span>
              <span>Price</span>
            </div>
          </div>
          {orderData.tests.map((test, index) => (
            <div key={index} className="mb-2 pb-1">
              <div className="flex justify-between" style={{ fontSize: '14.4px' }}>
                <div className="flex-1 pr-2">
                  <div>{test.name || 'N/A'}</div>
                  <div className="text-gray-600" style={{ fontSize: '14.4px' }}>({test.code || 'N/A'})</div>
                </div>
                <div>Rs. {(test.price || 0).toLocaleString()}</div>
              </div>
              {test.description && test.description.trim() !== '' && (
                <div className="text-gray-600 mt-1 pl-2 border-l-2 border-gray-400" style={{ fontSize: '14.4px' }}>
                  {test.description}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Payment Summary */}
        <div className="border-t border-dashed border-gray-400 pt-2 mb-4">
          <div className="flex justify-between font-semibold" style={{ fontSize: '16.8px' }}>
            <span>Subtotal:</span>
            <span>Rs. {Math.round(orderData.totalAmount || 0).toLocaleString()}</span>
          </div>

          {(orderData.discount || 0) > 0 && (
            <div className="flex justify-between text-red-600" style={{ fontSize: '14.4px' }}>
              <span>Discount ({orderData.discount}%):</span>
              <span>-Rs. {calculateDiscountAmount().toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold border-t border-dashed border-gray-400 pt-1 mt-1" style={{ fontSize: '16.8px' }}>
            <span>Total:</span>
            <span>Rs. {calculateFinalTotal().toLocaleString()}</span>
          </div>

          {(orderData.paidAmount || 0) > 0 && (
            <>
              <div className="flex justify-between text-green-600 mt-1" style={{ fontSize: '14.4px' }}>
                <span>Paid:</span>
                <span>Rs. {Math.round(orderData.paidAmount || 0).toLocaleString()}</span>
              </div>
              {calculateBalance() > 0 && (
                <div className="flex justify-between text-orange-600 font-semibold" style={{ fontSize: '14.4px' }}>
                  <span>Outstanding:</span>
                  <span>Rs. {calculateBalance().toLocaleString()}</span>
                </div>
              )}
              {calculateBalance() === 0 && (
                <div className="flex justify-between text-green-600 font-semibold" style={{ fontSize: '14.4px' }}>
                  <span>Status:</span>
                  <span>PAID</span>
                </div>
              )}
            </>
          )}
          {(orderData.paidAmount || 0) === 0 && (
            <div className="flex justify-between text-red-600 font-semibold mt-1" style={{ fontSize: '14.4px' }}>
              <span>Status:</span>
              <span>UNPAID</span>
            </div>
          )}
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div className="border-t border-dashed border-gray-400 pt-3 mt-4 flex flex-col items-center">
            <div className="font-semibold mb-2" style={{ fontSize: '14.4px' }}>Visit Us Online:</div>
            <Image
              src={qrCodeUrl}
              alt="Health Inn Lab QR Code"
              width={96}
              height={96}
              className="border border-gray-300"
            />
            <div className="mt-2 text-center text-gray-600" style={{ fontSize: '14.4px' }}>
              healthinnlab.vercel.app
            </div>
          </div>
        )}

        {/* Footer message */}
        <div className="text-center text-gray-600 border-t border-dashed border-gray-400 mt-4 pt-3" style={{ fontSize: '14.4px' }}>
          <p>Thank you for choosing Health Inn Services</p>
        </div>
      </div>
    );
  }
);

OrderReceipt.displayName = 'OrderReceipt';

export default OrderReceipt;