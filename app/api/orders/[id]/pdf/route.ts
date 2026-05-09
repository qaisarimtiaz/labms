import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (!['lab', 'reception', 'patient'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    await connectDB();

    const order = await TestOrder.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check access permissions
    if (userRole === 'patient') {
      // Patients can only access their own reports
      const patientId = (session.user as { id?: string }).id;
      if (order.patient.toString() !== patientId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    if (!order.reportPDF) {
      return NextResponse.json({ error: 'Report not available' }, { status: 404 });
    }

    // Return PDF with proper headers
    return new NextResponse(order.reportPDF, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Lab_Report_${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
