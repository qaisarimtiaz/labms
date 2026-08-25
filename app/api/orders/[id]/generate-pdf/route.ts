import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import '@/lib/models/Patient';
import '@/lib/models/LabTest';
import '@/lib/models/TestPackage';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    await connectDB();

    // Fetch order with populated data
    const order = await TestOrder.findById(id)
      .populate('patient', 'firstName lastName email phone patientId dateOfBirth gender')
      .populate('tests', 'code name price')
      .populate('packages', 'packageName price');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // For now, return the order data as JSON
    // The client will generate the PDF from this data using html2canvas and jsPDF
    return NextResponse.json({
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        patient: order.patient,
        tests: order.tests,
        packages: order.packages,
        referredByDoctor: order.referredByDoctor,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching order for PDF:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
