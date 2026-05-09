import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['admin', 'reception', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await request.json();
    const { discount } = body;

    if (discount === undefined || discount === null) {
      return NextResponse.json({ error: 'Discount percentage is required' }, { status: 400 });
    }

    const discountPercentage = parseFloat(discount);
    if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json({ error: 'Discount percentage must be between 0 and 100' }, { status: 400 });
    }

    await connectDB();

    const order = await TestOrder.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update discount percentage
    order.discount = discountPercentage;
    await order.save();

    // Return updated order with populated fields
    const updatedOrder = await TestOrder.findById(id).populate([
      { path: 'patient', select: 'firstName lastName email phone patientId dateOfBirth gender' },
      { path: 'tests', select: 'code name price description' },
      { path: 'packages', select: 'packageName price' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    return NextResponse.json({
      message: 'Discount updated successfully',
      order: updatedOrder
    });
  } catch (error: unknown) {
    console.error('Error updating discount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
