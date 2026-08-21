import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Patient from '@/lib/models/Patient';
import TestCategory from '@/lib/models/TestCategory';
import LabTest from '@/lib/models/LabTest';
import TestOrder from '@/lib/models/TestOrder';
import TestResult from '@/lib/models/TestResult';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const existingAdmin = await User.findOne({ email: 'admin@lab.com' });
    const existingCategories = await TestCategory.countDocuments();
    const existingTests = await LabTest.countDocuments();

    const createdCounts = {
      users: 0,
      categories: 0,
      tests: 0,
      patients: 0,
      orders: 0,
      results: 0
    };

    if (!existingAdmin) {
      const demoUsers = [
        {
          email: 'admin@lab.com',
          password: 'password123',
          role: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          phone: '+1234567890'
        },
        {
          email: 'tech@lab.com',
          password: 'password123',
          role: 'lab_tech',
          firstName: 'Lab',
          lastName: 'Technician',
          phone: '+1234567891'
        },
        {
          email: 'reception@lab.com',
          password: 'password123',
          role: 'reception',
          firstName: 'Reception',
          lastName: 'Staff',
          phone: '+1234567892'
        },
        {
          email: 'patient@lab.com',
          password: 'password123',
          role: 'patient',
          firstName: 'John',
          lastName: 'Patient',
          phone: '+1234567893'
        }
      ];

      for (const userData of demoUsers) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          const user = new User(userData);
          await user.save();
          createdCounts.users += 1;
        }
      }
    }

    let createdCategories = [];
    if (existingCategories === 0) {
      const demoCategories = [
        { name: 'Hematology', description: 'Blood-related tests including CBC, blood counts, and blood chemistry' },
        { name: 'Clinical Chemistry', description: 'Chemical analysis of blood and body fluids' },
        { name: 'Microbiology', description: 'Tests for infectious diseases and bacterial cultures' },
        { name: 'Immunology', description: 'Tests for immune system function and antibodies' },
        { name: 'Endocrinology', description: 'Hormone-related tests' }
      ];
      createdCategories = await TestCategory.insertMany(demoCategories);
      createdCounts.categories = createdCategories.length;
    } else {
      createdCategories = await TestCategory.find();
    }

    if (existingTests === 0) {
      const demoTests = [
        { code: 'CBC001', name: 'Complete Blood Count', description: 'Comprehensive blood test measuring various components', price: 500 },
        { code: 'ESR001', name: 'Erythrocyte Sedimentation Rate', description: 'Measures inflammation in the body', price: 300 },
        { code: 'GLU001', name: 'Blood Glucose (Fasting)', description: 'Measures blood sugar levels after fasting', price: 150 },
        { code: 'LIP001', name: 'Lipid Profile', description: 'Measures cholesterol and triglyceride levels', price: 800 },
        { code: 'LFT001', name: 'Liver Function Test', description: 'Comprehensive liver function assessment', price: 1200 },
        { code: 'UC001', name: 'Urine Culture', description: 'Test for urinary tract infections', price: 600 },
        { code: 'BC001', name: 'Blood Culture', description: 'Test for blood infections', price: 1500 },
        { code: 'HBV001', name: 'Hepatitis B Surface Antigen', description: 'Test for Hepatitis B infection', price: 400 },
        { code: 'HIV001', name: 'HIV Antibody Test', description: 'Test for HIV infection', price: 500 },
        { code: 'TSH001', name: 'Thyroid Stimulating Hormone', description: 'Test for thyroid function', price: 350 }
      ];
      await LabTest.insertMany(demoTests);
      createdCounts.tests = demoTests.length;
    }

    const patientUser = await User.findOne({ email: 'patient@lab.com' });
    const labTechUser = await User.findOne({ email: 'tech@lab.com' });
    const receptionUser = await User.findOne({ email: 'reception@lab.com' });
    let patientRecord = null;

    if (patientUser) {
      patientRecord = await Patient.findOne({ userId: patientUser._id });
      if (!patientRecord) {
        patientRecord = new Patient({
          userId: patientUser._id,
          firstName: patientUser.firstName,
          lastName: patientUser.lastName,
          email: patientUser.email,
          phone: patientUser.phone,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
          address: {
            street: '123 Sample Street',
            city: 'Karachi',
            state: 'Sindh',
            zipCode: '75500',
            country: 'Pakistan'
          },
          emergencyContact: {
            name: 'Patient Emergency',
            phone: '+1234567899',
            relationship: 'Relative'
          },
          medicalHistory: ['No known allergies']
        });
        await patientRecord.save();
        createdCounts.patients = 1;
      }
    }

    const sampleOrderExists = patientRecord
      ? await TestOrder.findOne({ patient: patientRecord._id, orderStatus: 'in_progress' })
      : null;

    let sampleOrder = sampleOrderExists;
    if (!sampleOrder && patientRecord && receptionUser) {
      const tests = await LabTest.find({ code: { $in: ['CBC001', 'LIP001'] } });
      if (tests.length > 0) {
        sampleOrder = new TestOrder({
          patient: patientRecord._id,
          tests: tests.map(test => test._id),
          totalAmount: tests.reduce((sum, test) => sum + test.price, 0),
          paidAmount: tests.reduce((sum, test) => sum + test.price, 0),
          discount: 0,
          paymentMethod: 'cash',
          orderStatus: 'in_progress',
          priority: 'normal',
          referredByDoctor: 'Dr. Ahmed Khan',
          sampleCollectionDate: new Date(),
          expectedReportDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          notes: 'Sample report-ready order',
          createdBy: receptionUser._id
        });
        await sampleOrder.save();
        createdCounts.orders = 1;
      }
    }

    if (sampleOrder && labTechUser) {
      const existingResults = await TestResult.countDocuments({ testOrder: sampleOrder._id });
      if (existingResults === 0) {
        const tests = await LabTest.find({ code: { $in: ['CBC001', 'LIP001'] } });
        const resultRecords = [
          {
            testOrder: sampleOrder._id,
            test: tests.find(test => test.code === 'CBC001')?._id,
            patient: patientRecord._id,
            technician: labTechUser._id,
            resultData: [
              { parameter: 'WBC', value: '6.2', unit: 'x10^3/µL', normalRange: '4.0-10.0', flag: 'normal' },
              { parameter: 'RBC', value: '4.8', unit: 'x10^6/µL', normalRange: '4.5-5.9', flag: 'normal' },
              { parameter: 'Hemoglobin', value: '15.2', unit: 'g/dL', normalRange: '13.5-17.5', flag: 'normal' }
            ],
            overallStatus: 'normal',
            comments: 'Normal complete blood count.',
            reportedDate: new Date()
          },
          {
            testOrder: sampleOrder._id,
            test: tests.find(test => test.code === 'LIP001')?._id,
            patient: patientRecord._id,
            technician: labTechUser._id,
            resultData: [
              { parameter: 'Total Cholesterol', value: '180', unit: 'mg/dL', normalRange: '<200', flag: 'normal' },
              { parameter: 'HDL', value: '52', unit: 'mg/dL', normalRange: '>40', flag: 'normal' },
              { parameter: 'LDL', value: '110', unit: 'mg/dL', normalRange: '<130', flag: 'normal' }
            ],
            overallStatus: 'normal',
            comments: 'Lipid levels are within normal limits.',
            reportedDate: new Date()
          }
        ];

        for (const resultData of resultRecords) {
          if (resultData.test) {
            const result = new TestResult(resultData);
            await result.save();
            createdCounts.results += 1;
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Demo data created successfully',
      created: createdCounts
    });
  } catch (error: unknown) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create demo data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
