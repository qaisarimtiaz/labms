// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import connectDB from '../lib/mongodb';
import LabTest from '../lib/models/LabTest';

async function listAllTests() {
  try {
    await connectDB();

    const tests = await LabTest.find({}).sort({ name: 1 });

    console.log(`\nTotal tests in database: ${tests.length}\n`);
    console.log('='.repeat(100));
    console.log('CODE\t\t| NAME\t\t\t\t\t| PRICE');
    console.log('='.repeat(100));

    tests.forEach(test => {
      const code = test.code.padEnd(15);
      const name = test.name.padEnd(40);
      const price = `Rs ${test.price}`;
      console.log(`${code}| ${name}| ${price}`);
    });

    console.log('='.repeat(100));

    // Check for specialized format tests
    console.log('\n\nPotential Specialized Format Tests:');
    console.log('='.repeat(100));

    const specializedKeywords = [
      'ANA', 'ENA', 'myopathies', 'myopathy', 'neuronal',
      'paraneoplastic', 'sclerosis', 'autoimmune liver'
    ];

    specializedKeywords.forEach(keyword => {
      const matchingTests = tests.filter(t =>
        t.name.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchingTests.length > 0) {
        console.log(`\n${keyword.toUpperCase()}:`);
        matchingTests.forEach(test => {
          console.log(`  - ${test.code}: ${test.name}`);
        });
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Error listing tests:', error);
    process.exit(1);
  }
}

listAllTests();
