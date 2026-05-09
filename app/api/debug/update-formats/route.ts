import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';

// Mapping of test codes to their report formats
const TEST_FORMAT_MAPPINGS: Record<string, string> = {
  // ANA Tests
  'IMM-ANA-04': 'ana-23',        // ANA Profile 23 IgG

  // ENA Tests
  'IMM-ENA-01': 'ena',           // ENA Profile Blot IgG

  // Myopathies Tests
  'IMM-MYP-01': 'myopathies-hmgcr',  // Myopathies/Myositis Profile IgG (HMGCR)
  'IMM-MYP-02': 'myopathies',        // Myositis/Myopathies Profile IgG

  // Neuronal Tests
  'IMM-NA-01': 'neuronal-profile',   // Neuronal Antigens Profile IgG

  // Paraneoplastic Tests
  'IMM-PNS-01': 'paraneoplastic-profile',  // Paraneoplastic Neurologic Syndromes Profile IgG

  // Systemic Sclerosis Tests
  'IMM-SS-01': 'systemic-sclerosis', // Systemic Sclerosis Profile IgG

  // Autoimmune Liver Disease Tests
  'IMM-ALD-01': 'autoimmune-liver',  // Autoimmune Liver Profile IgG
  'IMM-ALD-02': 'autoimmune-liver',  // Autoimmune Liver Profile with F-Actin IgG
};

export async function POST() {
  try {
    await connectDB();

    const updates = [];
    const errors = [];

    for (const [testCode, formatType] of Object.entries(TEST_FORMAT_MAPPINGS)) {
      const test = await LabTest.findOne({ code: testCode });

      if (!test) {
        errors.push({
          code: testCode,
          error: 'Test not found in database'
        });
        continue;
      }

      const oldFormat = test.reportFormat || 'standard';

      // Use findOneAndUpdate to ensure the field is set
      const updatedTest = await LabTest.findOneAndUpdate(
        { code: testCode },
        { $set: { reportFormat: formatType } },
        { new: true, runValidators: true }
      );

      updates.push({
        code: testCode,
        name: test.name,
        oldFormat,
        newFormat: formatType,
        actualValue: updatedTest?.reportFormat
      });
    }

    // Get all tests with specialized formats for verification
    const specializedTests = await LabTest.find({
      reportFormat: { $ne: 'standard' }
    }).sort({ code: 1 });

    return NextResponse.json({
      success: true,
      summary: {
        updated: updates.length,
        errors: errors.length,
        total: Object.keys(TEST_FORMAT_MAPPINGS).length
      },
      updates,
      errors,
      verification: {
        specializedTestsCount: specializedTests.length,
        tests: specializedTests.map(t => ({
          code: t.code,
          name: t.name,
          format: t.reportFormat
        }))
      }
    });
  } catch (error) {
    console.error('Error updating test formats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update test formats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
