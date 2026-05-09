import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LabTest from '@/lib/models/LabTest';
import mongoose from 'mongoose';

interface SessionUser {
  id: string;
  role: string;
  email: string;
}

interface TestQuery {
  $or?: Array<{
    code?: { $regex: string; $options: string };
    name?: { $regex: string; $options: string };
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    await connectDB();

    const query: TestQuery = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const tests = await LabTest.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 });

    const total = await LabTest.countDocuments(query);

    console.log('Tests fetched:', tests.length, 'First test:', tests[0] ? { code: tests[0].code, description: tests[0].description } : 'none');

    return NextResponse.json({
      tests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, price, description, type, reportFormat, templateId } = body;

    console.log('Test POST received:', { code, name, price, description, type, templateId });

    if (!code || !name || !price) {
      return NextResponse.json({
        error: 'Missing required fields: code, name, price'
      }, { status: 400 });
    }

    await connectDB();

    // Check if test code already exists
    const existingTest = await LabTest.findOne({ code: code.toUpperCase() });
    if (existingTest) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }

    const testData: {
      code: string;
      name: string;
      price: number;
      description: string;
      reportFormat: string;
      type?: string;
      template?: string;
    } = {
      code: code.toUpperCase(),
      name,
      price,
      description: description && description.trim() ? description.trim() : '',
      reportFormat: reportFormat || 'standard'
    };

    if (type) {
      testData.type = type;
    }

    if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
      testData.template = templateId;
    }

    console.log('Creating test with data:', testData);

    const test = new LabTest(testData);

    console.log('Test object before save:', test.toObject());
    await test.save();
    console.log('Test saved to DB:', test.toObject());

    return NextResponse.json({ 
      message: 'Test created successfully', 
      test 
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating test:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}