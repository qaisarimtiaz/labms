import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Patient from '@/lib/models/Patient';

// Helper function to generate random string
function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    await connectDB();

    // Build query for patient users only
    const query: Record<string, unknown> = { role: 'patient' };
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(query);

    return NextResponse.json({ 
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: unknown) {
    console.error('Get patient users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'reception'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Reception or Admin access required' },
        { status: 403 }
      );
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      medicalHistory
    } = await req.json();

    // Validation - only firstName and lastName are required
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    await connectDB();

    let generatedEmail = email;
    let generatedPassword = password;

    // Auto-generate email if not provided
    if (!email) {
      let counter = 1;
      let uniqueEmail = '';
      let emailExists = true;

      while (emailExists) {
        uniqueEmail = `p${counter}@health.inn.com`;
        const existingEmailUser = await User.findOne({ email: uniqueEmail });
        if (!existingEmailUser) {
          emailExists = false;
          generatedEmail = uniqueEmail;
        } else {
          counter++;
        }
      }
    } else {
      // Check if provided email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
      generatedEmail = email;
    }

    // Auto-generate password if not provided
    if (!password) {
      generatedPassword = generateRandomString(10);
    }

    // Create new patient user (role is locked to patient)
    const userData: Record<string, unknown> = {
      firstName,
      lastName,
      email: generatedEmail,
      phone,
      password: generatedPassword,
      role: 'patient',
      isActive: true,
    };

    // Add optional fields if provided
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
    if (gender) userData.gender = gender;
    if (address) userData.address = address;
    if (emergencyContact) userData.emergencyContact = emergencyContact;
    if (medicalHistory) userData.medicalHistory = medicalHistory;

    const user = await User.create(userData);

    // Store the plain text password in Patient record for receipt display
    try {
      let patientRecord = await Patient.findOne({ userId: user._id });
      if (!patientRecord) {
        // Create patient record with temp password
        patientRecord = await Patient.create({
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('1990-01-01'),
          gender: gender || 'other',
          address: address || {},
          emergencyContact: emergencyContact || {},
          medicalHistory: medicalHistory || [],
          tempPassword: generatedPassword
        });
      } else {
        // Update existing patient record with temp password
        patientRecord.tempPassword = generatedPassword;
        patientRecord.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : patientRecord.dateOfBirth;
        patientRecord.gender = gender || patientRecord.gender;
        patientRecord.address = address || patientRecord.address;
        patientRecord.emergencyContact = emergencyContact || patientRecord.emergencyContact;
        patientRecord.medicalHistory = medicalHistory || patientRecord.medicalHistory;
        await patientRecord.save();
      }
    } catch (patientErr) {
      console.error('Error storing temp password in patient record:', patientErr);
      // Continue anyway - this is not critical
    }

    // Return user without password, but include generated credentials
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return NextResponse.json({
      message: 'Patient created successfully',
      user: userWithoutPassword,
      credentials: {
        email: generatedEmail,
        password: generatedPassword,
        wasGenerated: !email || !password // Flag to indicate if credentials were auto-generated
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Create patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}