import nodemailer from 'nodemailer';

// Email configuration from environment variables
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true' ? true : (process.env.EMAIL_PORT === '465' ? true : false),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  // Add additional SMTP options for better compatibility
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
};

// Create reusable transporter object
const transporter = nodemailer.createTransport(emailConfig);

interface PatientData {
  firstName: string;
  lastName: string;
  email: string;
  patientId: string;
}

interface EmailNotificationData {
  patient: PatientData;
  orderNumber: string;
  reportGeneratedDate: string;
}

export const sendReportNotification = async (data: EmailNotificationData): Promise<boolean> => {
  try {
    console.log('Preparing to send email notification...');
    console.log('Email config:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user
    });

    const { patient, orderNumber, reportGeneratedDate } = data;
    const fullName = `${patient.firstName} ${patient.lastName}`.trim();

    console.log('Recipient:', patient.email);
    console.log('Order:', orderNumber);

    const mailOptions = {
      from: `"Health Inn Services Laboratory" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: `Lab Report Ready - Order #${orderNumber}`,
      replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      headers: {
        'X-Mailer': 'Health Inn Services Laboratory System',
        'X-Priority': '3',
        'Message-ID': `<${Date.now()}.${patient.patientId}.${orderNumber}@${process.env.EMAIL_HOST || 'localhost'}>`,
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Lab Report Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
            
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">Health Inn Services Laboratory</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Professional Laboratory Services</p>
            </div>

            <div style="margin-bottom: 20px;">
              <h2 style="color: #333;">Dear ${fullName},</h2>
              <p>We are pleased to inform you that your laboratory test results are now ready.</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #2563eb; margin-top: 0;">Report Details</h3>
              <p><strong>Patient ID:</strong> ${patient.patientId}</p>
              <p><strong>Order Number:</strong> #${orderNumber}</p>
              <p><strong>Report Date:</strong> ${reportGeneratedDate}</p>
            </div>

            <p>Your test results have been reviewed and approved by our medical professionals. Please contact our laboratory to collect your report.</p>

            <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>Contact Information:</strong><br>
              Health Inn Services Laboratory<br>
              Email: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}</p>
            </div>

            <div style="background-color: #f8d7da; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #dc3545;">
              <p style="margin: 0; color: #721c24;"><strong>Important:</strong> This is an automated notification. Please do not reply to this email.</p>
            </div>

            <p>Thank you for choosing Health Inn Services Laboratory.</p>
            <p><strong>Best regards,<br>Health Inn Services Laboratory Team</strong></p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Health Inn Services Laboratory. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Dear ${fullName},

We are pleased to inform you that your laboratory test results are now ready and have been processed by our medical team.

Report Details:
- Patient ID: ${patient.patientId}
- Order Number: #${orderNumber}
- Report Date: ${reportGeneratedDate}

Your test results have been thoroughly reviewed and approved by our qualified medical professionals. 
Please contact our laboratory to collect your printed report or discuss your results with our medical team.

Contact Information:
Health Inn Services Laboratory
Email: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}

Important: This is an automated notification. Please do not reply to this email. 
For medical advice or questions about your results, please contact our laboratory directly.

Thank you for choosing Health Inn Services Laboratory for your healthcare needs.

Best regards,
Health Inn Services Laboratory Team

© ${new Date().getFullYear()} Health Inn Services Laboratory. All rights reserved.
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
    
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

// Test email configuration
export const testEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};