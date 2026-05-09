import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST() {
  try {
    await connectDB();
    
    // Delete all existing users
    await User.deleteMany({});
    
    // Create fresh demo users
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

    // Create users (loop to trigger pre-save hooks for password hashing)
    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
    }

    return NextResponse.json({ 
      message: 'Users reset successfully',
      data: {
        deleted: 'all old users',
        created: demoUsers.map(user => ({ email: user.email, role: user.role }))
      }
    });
  } catch (error: unknown) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
