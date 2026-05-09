import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestTemplate from '@/lib/models/TestTemplate';

interface RawParameter {
  name: string;
  unit?: string;
  referenceRange?: string;
  minReferenceRange?: string;
  maxReferenceRange?: string;
  sequenceOrder?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    await connectDB();

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { templateName: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (activeOnly) query.isActive = true;

    const templates = await TestTemplate.find(query).sort({ templateName: 1 });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create templates' }, { status: 403 });
    }

    const body = await request.json();
    const { templateName, category, parameters } = body;

    if (!templateName?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json({ error: 'At least one parameter is required' }, { status: 400 });
    }

    for (const param of parameters) {
      if (!param.name?.trim()) {
        return NextResponse.json({ error: 'Each parameter must have a name' }, { status: 400 });
      }
    }

    await connectDB();

    const template = new TestTemplate({
      templateName: templateName.trim(),
      category: category?.trim() || '',
      parameters: parameters.map((p: RawParameter, idx: number) => ({
        name: p.name.trim(),
        unit: p.unit?.trim() || '',
        referenceRange: p.referenceRange?.trim() || '',
        minReferenceRange: p.minReferenceRange?.trim() || '',
        maxReferenceRange: p.maxReferenceRange?.trim() || '',
        sequenceOrder: p.sequenceOrder ?? idx
      }))
    });

    await template.save();
    return NextResponse.json({ message: 'Template created successfully', template }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating template:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
