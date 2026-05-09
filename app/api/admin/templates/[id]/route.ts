import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestTemplate from '@/lib/models/TestTemplate';
import mongoose from 'mongoose';

interface RawParameter {
  name: string;
  unit?: string;
  referenceRange?: string;
  minReferenceRange?: string;
  maxReferenceRange?: string;
  sequenceOrder?: number;
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
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();

    const template = await TestTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update templates' }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json();
    const { templateName, category, parameters, isActive } = body;

    if (parameters !== undefined) {
      if (!Array.isArray(parameters) || parameters.length === 0) {
        return NextResponse.json({ error: 'At least one parameter is required' }, { status: 400 });
      }
      for (const param of parameters) {
        if (!param.name?.trim()) {
          return NextResponse.json({ error: 'Each parameter must have a name' }, { status: 400 });
        }
      }
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (templateName !== undefined) updateData.templateName = templateName.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (parameters !== undefined) {
      updateData.parameters = parameters.map((p: RawParameter, idx: number) => ({
        name: p.name.trim(),
        unit: p.unit?.trim() || '',
        referenceRange: p.referenceRange?.trim() || '',
        minReferenceRange: p.minReferenceRange?.trim() || '',
        maxReferenceRange: p.maxReferenceRange?.trim() || '',
        sequenceOrder: p.sequenceOrder ?? idx
      }));
    }

    const template = await TestTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template updated successfully', template });
  } catch (error: unknown) {
    console.error('Error updating template:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
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

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete templates' }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectDB();

    // Unlink this template from any LabTests that reference it before deleting
    const LabTest = (await import('@/lib/models/LabTest')).default;
    await LabTest.updateMany({ template: id }, { $unset: { template: 1 } });

    const template = await TestTemplate.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
