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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    await connectDB();

    const test = await LabTest.findById(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error: unknown) {
    console.error('Error fetching test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    const body = await request.json();
    const { code, name, price, description, type, reportFormat, templateId } = body;

    console.log('Test PUT received:', { id, code, name, price, description, type });

    await connectDB();

    const test = await LabTest.findById(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if test code is being changed and if it already exists
    if (code && code.toUpperCase() !== test.code) {
      const existingTest = await LabTest.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingTest) {
        return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    const unsetData: Record<string, unknown> = {};

    if (code) updateData.code = code.toUpperCase();
    if (name) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) {
      updateData.description = description && description.trim() ? description.trim() : '';
    }
    if (type) {
      updateData.type = type;
    } else {
      unsetData.type = 1;
    }
    if (reportFormat) {
      updateData.reportFormat = reportFormat;
    }
    if (templateId !== undefined) {
      if (templateId === '' || templateId === null) {
        unsetData.template = 1;
      } else if (mongoose.Types.ObjectId.isValid(templateId)) {
        updateData.template = templateId;
      }
    }

    const updateOperation: Record<string, unknown> = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateOperation.$unset = unsetData;
    }

    console.log('Update operation being sent to DB:', updateOperation);

    const updatedTest = await LabTest.findByIdAndUpdate(
      id,
      updateOperation,
      { new: true, runValidators: true }
    );

    console.log('Test updated successfully:', {
      id: updatedTest?._id,
      code: updatedTest?.code,
      description: updatedTest?.description,
      descriptionLength: updatedTest?.description?.length
    });

    return NextResponse.json({ 
      message: 'Test updated successfully', 
      test: updatedTest 
    });
  } catch (error: unknown) {
    console.error('Error updating test:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Test with this code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as SessionUser).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete tests' }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    await connectDB();

    const test = await LabTest.findByIdAndDelete(id);
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Test deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}