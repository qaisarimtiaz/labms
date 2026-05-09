import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import TestOrder from '@/lib/models/TestOrder';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LabTest from '@/lib/models/LabTest';

interface SessionUser {
  id: string;
  role: string;
  email: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (userRole !== 'reception') {
      return NextResponse.json({ error: 'Access denied. Reception role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Parse the date parameter or default to today
    let targetDate: Date;
    if (dateParam) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        return NextResponse.json({
          error: 'Invalid date format. Use YYYY-MM-DD format.'
        }, { status: 400 });
      }
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json({
          error: 'Invalid date value.'
        }, { status: 400 });
      }
    } else {
      targetDate = new Date();
    }

    // Set the date range for the target date (start of day to end of day)
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1
    );

    await connectDB();

    // Query patients created on the specified date
    const patients = await Patient.find({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    })
    .populate('userId', 'email role')
    .sort({ createdAt: -1 })
    .lean();

    // Query test orders assigned on the specified date
    const testOrders = await TestOrder.find({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    })
    .populate('patient', 'firstName lastName email phone patientId gender dateOfBirth')
    .populate('tests', 'code name price type')
    .populate('packages', 'name price')
    .populate('createdBy', 'email role')
    .sort({ createdAt: -1 })
    .lean();

    // Format the response with full details
    const formattedPatients = patients.map(patient => ({
      _id: patient._id,
      patientId: patient.patientId,
      name: `${patient.firstName} ${patient.lastName}`,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email || 'N/A',
      phone: patient.phone || 'N/A',
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: {
        street: patient.address?.street || '',
        city: patient.address?.city || '',
        state: patient.address?.state || '',
        zipCode: patient.address?.zipCode || '',
        country: patient.address?.country || 'Pakistan'
      },
      emergencyContact: {
        name: patient.emergencyContact?.name || 'N/A',
        phone: patient.emergencyContact?.phone || 'N/A',
        relationship: patient.emergencyContact?.relationship || 'N/A'
      },
      medicalHistory: patient.medicalHistory || [],
      createdAt: patient.createdAt,
      userId: patient.userId
    }));

    const formattedTestOrders = testOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      patient: order.patient || {
        firstName: 'Unknown',
        lastName: 'Patient',
        email: 'N/A',
        phone: 'N/A',
        patientId: 'N/A'
      },
      tests: order.tests || [],
      packages: order.packages || [],
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      discount: order.discount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      priority: order.priority,
      referredByDoctor: order.referredByDoctor || 'N/A',
      sampleCollectionDate: order.sampleCollectionDate,
      expectedReportDate: order.expectedReportDate,
      completedAt: order.completedAt,
      notes: order.notes || '',
      createdBy: order.createdBy,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        date: startOfDay.toISOString().split('T')[0],
        patients: formattedPatients,
        testOrders: formattedTestOrders,
        summary: {
          totalPatients: formattedPatients.length,
          totalOrders: formattedTestOrders.length,
          totalRevenue: formattedTestOrders.reduce((sum, order) => sum + order.totalAmount, 0),
          totalPaid: formattedTestOrders.reduce((sum, order) => sum + order.paidAmount, 0)
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching reception reports:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
