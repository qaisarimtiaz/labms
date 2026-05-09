import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';

export async function GET() {
  try {
    await connectDB();

    // Get the 9 tests we updated
    const testCodes = [
      'IMM-ANA-04',
      'IMM-ENA-01',
      'IMM-MYP-01',
      'IMM-MYP-02',
      'IMM-NA-01',
      'IMM-PNS-01',
      'IMM-SS-01',
      'IMM-ALD-01',
      'IMM-ALD-02'
    ];

    const tests = await LabTest.find({ code: { $in: testCodes } }).sort({ code: 1 });

    return NextResponse.json({
      total: tests.length,
      tests: tests.map(t => ({
        code: t.code,
        name: t.name,
        reportFormat: t.reportFormat,
        reportFormatRaw: JSON.stringify(t.toObject()),
        hasCorrectFormat: t.reportFormat !== 'standard' && t.reportFormat !== undefined && t.reportFormat !== null
      }))
    });
  } catch (error) {
    console.error('Error verifying formats:', error);
    return NextResponse.json(
      { error: 'Failed to verify formats' },
      { status: 500 }
    );
  }
}
