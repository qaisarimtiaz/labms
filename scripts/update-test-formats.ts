// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import connectDB from '../lib/mongodb';
import LabTest from '../lib/models/LabTest';

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

async function updateTestFormats() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected successfully!\n');

    let updatedCount = 0;
    let skippedCount = 0;

    console.log('Updating test formats...\n');
    console.log('='.repeat(80));

    for (const [testCode, formatType] of Object.entries(TEST_FORMAT_MAPPINGS)) {
      const test = await LabTest.findOne({ code: testCode });

      if (!test) {
        console.log(`❌ Test ${testCode} not found in database - SKIPPED`);
        skippedCount++;
        continue;
      }

      // Update the test with the new format
      test.reportFormat = formatType;
      await test.save();

      console.log(`✅ Updated: ${testCode} - ${test.name}`);
      console.log(`   Format: standard → ${formatType}\n`);
      updatedCount++;
    }

    console.log('='.repeat(80));
    console.log(`\nUpdate Summary:`);
    console.log(`  ✅ Successfully updated: ${updatedCount} tests`);
    console.log(`  ❌ Skipped (not found): ${skippedCount} tests`);
    console.log(`  📊 Total processed: ${Object.keys(TEST_FORMAT_MAPPINGS).length} mappings\n`);

    // Verify the updates
    console.log('Verifying updates...\n');
    const specializedTests = await LabTest.find({ reportFormat: { $ne: 'standard' } }).sort({ code: 1 });

    console.log(`Found ${specializedTests.length} tests with specialized formats:\n`);
    specializedTests.forEach(test => {
      console.log(`  ${test.code}: ${test.name}`);
      console.log(`  → Format: ${test.reportFormat}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error updating test formats:', error);
    process.exit(1);
  }
}

updateTestFormats();
