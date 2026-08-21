import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';

// Debug endpoint to list all orders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('Debug orders list API called');

    await connectDB();
    
    const orders = await TestOrder.find({})
      .select('_id orderNumber patient totalAmount paymentStatus')
      .populate('patient', 'firstName lastName email')
      .limit(10)
      .sort({ createdAt: -1 });
    
    console.log('Found orders:', orders.length);
    
    const ordersList = orders.map(order => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      patient: order.patient,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus
    }));
    
    return NextResponse.json({ 
      total: orders.length,
      orders: ordersList
    });
  } catch (error: unknown) {
    console.error('Error listing orders:', error);
    return NextResponse.json({ 
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}