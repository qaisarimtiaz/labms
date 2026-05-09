import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Patient from '@/lib/models/Patient';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'reception') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const now = new Date();

    // Today's date range
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // This week's date range (Monday to Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // This month's date range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get test assignments for today
    const testsAssignedToday = await TestOrder.countDocuments({
      createdAt: { $gte: startOfToday, $lt: endOfToday }
    });

    // Get test assignments for this week
    const testsAssignedThisWeek = await TestOrder.countDocuments({
      createdAt: { $gte: startOfWeek, $lt: endOfWeek }
    });

    // Get test assignments for this month
    const testsAssignedThisMonth = await TestOrder.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: endOfMonth }
    });

    // Test status distribution
    const testStatusDistribution = await TestOrder.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Recent orders for quick view (last 10)
    let recentOrders;
    try {
      recentOrders = await TestOrder.find({})
        .populate('patient', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } catch (populateError) {
      console.error('Error populating patient data:', populateError);
      // Fallback without populate
      recentOrders = await TestOrder.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    return NextResponse.json({
      tests: {
        assignedToday: testsAssignedToday,
        assignedThisWeek: testsAssignedThisWeek,
        assignedThisMonth: testsAssignedThisMonth,
      },
      statusDistribution: testStatusDistribution,
      recentOrders: recentOrders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        patient: order.patient || { firstName: 'Unknown', lastName: 'Patient', email: 'N/A' },
        testCount: order.tests?.length || 0,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      }))
    });

  } catch (error: unknown) {
    console.error('Error fetching reception analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
