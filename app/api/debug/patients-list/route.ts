import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';

// Debug endpoint to list all patients
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

    console.log('Debug patients list API called');

    await connectDB();
    
    const patients = await Patient.find({})
      .select('_id userId firstName lastName email patientId')
      .limit(10)
      .sort({ createdAt: -1 });
    
    console.log('Found patients:', patients.length);
    
    const patientsList = patients.map(patient => ({
      id: patient._id.toString(),
      userId: patient.userId?.toString() || 'no userId',
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      patientId: patient.patientId
    }));
    
    return NextResponse.json({ 
      total: patients.length,
      patients: patientsList
    });
  } catch (error: unknown) {
    console.error('Error listing patients:', error);
    return NextResponse.json({ 
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}