import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';
import '@/lib/models/TestTemplate';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    if (!testId || !mongoose.Types.ObjectId.isValid(testId)) {
      return NextResponse.json({ error: 'Valid testId is required' }, { status: 400 });
    }

    await connectDB();

    const labTest = await LabTest.findById(testId).populate('template');
    if (!labTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ template: labTest.template || null });
  } catch (error) {
    console.error('Error fetching lab template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
