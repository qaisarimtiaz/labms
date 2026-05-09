import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendReportNotification } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only lab technicians and admins can send report notifications
    const userRole = (session.user as { role: string }).role;
    if (!['admin', 'lab_tech'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Only lab technicians and admins can send report notifications' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, orderNumber, patient, reportGeneratedDate } = body;

    // Validate required fields
    if (!orderId || !orderNumber || !patient || !reportGeneratedDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId, orderNumber, patient, reportGeneratedDate' 
      }, { status: 400 });
    }

    // Validate patient data
    if (!patient.email || !patient.firstName || !patient.patientId) {
      return NextResponse.json({ 
        error: 'Patient data must include email, firstName, and patientId' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patient.email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Prepare email data
    const emailData = {
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName || '',
        email: patient.email,
        patientId: patient.patientId,
      },
      orderNumber: orderNumber,
      reportGeneratedDate: reportGeneratedDate,
    };

    // Send email notification
    console.log('Attempting to send email notification...');
    const emailSent = await sendReportNotification(emailData);

    if (emailSent) {
      return NextResponse.json({ 
        message: 'Email notification sent successfully',
        recipientEmail: patient.email,
        orderNumber: orderNumber
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send email notification. Please check email configuration.' 
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error sending email notification:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
        return NextResponse.json({ 
          error: 'Email server connection failed. Please check email configuration.' 
        }, { status: 500 });
      }
      
      if (error.message.includes('authentication') || error.message.includes('535')) {
        return NextResponse.json({ 
          error: 'Email authentication failed. Please check email credentials.' 
        }, { status: 500 });
      }
      
      if (error.message.includes('Invalid login')) {
        return NextResponse.json({ 
          error: 'Email login failed. Please verify email username and password.' 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error while sending email notification' 
    }, { status: 500 });
  }
}