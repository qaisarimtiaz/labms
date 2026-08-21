import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';

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

    await connectDB();

    const tests = await LabTest.find({}).sort({ name: 1 });

    // Check for specialized format tests
    const specializedKeywords = [
      'ANA', 'ENA', 'myopathies', 'myopathy', 'neuronal',
      'paraneoplastic', 'sclerosis', 'autoimmune liver'
    ];

    const categorizedTests: Record<string, Array<{ code: string; name: string; price: number }>> = {};

    specializedKeywords.forEach(keyword => {
      const matchingTests = tests.filter(t =>
        t.name.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchingTests.length > 0) {
        categorizedTests[keyword] = matchingTests.map(t => ({
          code: t.code,
          name: t.name,
          price: t.price
        }));
      }
    });

    return NextResponse.json({
      total: tests.length,
      allTests: tests.map(t => ({
        code: t.code,
        name: t.name,
        price: t.price,
        description: t.description,
        reportFormat: t.reportFormat || 'standard'
      })),
      specializedTests: categorizedTests
    });
  } catch (error) {
    console.error('Error listing tests:', error);
    return NextResponse.json(
      { error: 'Failed to list tests' },
      { status: 500 }
    );
  }
}
