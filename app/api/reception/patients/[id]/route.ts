import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await connectDB();

    // Get user with password for receipt display
    const user = await User.findById(id).select('+password');

    if (!user || user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Patient user not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        password: user.password,
        role: user.role
      }
    });

  } catch (error: unknown) {
    console.error('Get patient user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await connectDB();

    // Find and delete the patient user
    const user = await User.findByIdAndDelete(id);

    if (!user || user.role !== 'patient') {
      return NextResponse.json(
        { error: 'Patient user not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Patient deleted successfully',
      deletedUser: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

  } catch (error: unknown) {
    console.error('Delete patient user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
