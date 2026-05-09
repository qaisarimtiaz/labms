import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';

export async function GET() {
  // Allow public access for debugging (remove auth check)
  try {
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
