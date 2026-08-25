import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestResult from '@/lib/models/TestResult';
import TestOrder from '@/lib/models/TestOrder';
import '@/lib/models/Patient';
import '@/lib/models/LabTest';
import '@/lib/models/TestPackage';
import '@/lib/models/User';
import jsPDF from 'jspdf';
import fs from 'fs';
import path from 'path';

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'patient' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectDB();

    // Get order details
    const order = await TestOrder.findById(orderId)
      .populate({
        path: 'tests',
        select: 'name code price'
      })
      .populate({
        path: 'packages',
        select: 'packageName packageCode packagePrice',
        populate: {
          path: 'tests',
          select: 'name code price'
        }
      })
      .populate('patient', 'firstName lastName patientId dateOfBirth gender');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If patient, verify they own this order
    if (session.user.role === 'patient') {
      const Patient = (await import('@/lib/models/Patient')).default;
      const patient = await Patient.findOne({ userId: session.user.id });
      
      if (!patient || order.patient._id.toString() !== patient._id.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get test results
    const testResults = await TestResult.find({ testOrder: orderId })
      .populate({
        path: 'test',
        select: 'code name price normalRange sampleType description'
      })
      .populate({
        path: 'technician',
        select: 'firstName lastName'
      })
      .sort({ createdAt: -1 });

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 30;

    // Helper function to add header on every page
    const addHeader = () => {
      let headerY = 10;

      // Top border line (thick)
      doc.setLineWidth(1);
      doc.line(10, headerY, pageWidth - 10, headerY);
      headerY += 5;

      // Add full logo - scaled to fit nicely
      try {
        const logoPath = path.join(process.cwd(), 'public', 'Full_logo.jpg');
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          const logoBase64 = logoBuffer.toString('base64');
          // Logo spans full usable page width, height preserves aspect ratio (4456×594)
          const logoWidth = pageWidth - 20;
          const logoHeight = Math.round(logoWidth * (594 / 4456));
          const logoX = 10;
          doc.addImage(`data:image/jpeg;base64,${logoBase64}`, 'JPEG', logoX, headerY, logoWidth, logoHeight);
          headerY += logoHeight + 4;
        }
      } catch {
        console.log('Full logo file not found, skipping logo');
      }

      // Black background title bar — taller with larger text
      const barHeight = 14;
      doc.setFillColor(0, 0, 0);
      doc.rect(10, headerY, pageWidth - 20, barHeight, 'F');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('LABORATORY TEST REPORT', pageWidth / 2, headerY + barHeight / 2 + 2.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      return headerY + barHeight + 4;
    };

    // Helper function to add footer on every page
    const addFooter = () => {
      const footerY = pageHeight - 15;

      // Line separator (thick)
      doc.setLineWidth(0.5);
      doc.line(10, footerY - 8, pageWidth - 10, footerY - 8);

      // Footer content
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Electronically issued test report duly verified by pathologist, no signature required.', pageWidth / 2, footerY - 4, { align: 'center' });

      const address = 'Office No. 101, Building No. 60-C, Zulfiqar Commercial Street No. 04, Phase VIII DHA, Karachi, Pakistan';
      doc.text(address, pageWidth / 2, footerY + 1, { align: 'center', maxWidth: pageWidth - 40 });
    };

    // Helper function to add new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 40) {
        addFooter();
        doc.addPage();
        currentY = addHeader();
        return true;
      }
      return false;
    };

    // Add header to first page
    currentY = addHeader();

    // Date on right side
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateText = `Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - dateWidth - 20, currentY);
    currentY += 10;

    // Patient Information Box
    const boxX = 15;
    const boxY = currentY;
    const boxWidth = pageWidth - 30;
    const boxHeight = 35;

    // Draw box border
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, boxHeight);

    currentY = boxY + 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', pageWidth / 2, currentY, { align: 'center' });

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // First row: Patient Name and Patient ID
    const patientName = `${order.patient.firstName} ${order.patient.lastName}`.toUpperCase();
    doc.text(`Patient Name: ${patientName}`, boxX + 3, currentY);
    doc.text(`Patient ID: ${order.patient.patientId}`, pageWidth / 2 + 5, currentY);

    currentY += 6;
    // Second row: Gender, Age, and Date of Sample Collection
    const genderDisplay = order.patient.gender ? order.patient.gender.toUpperCase() : 'N/A';
    let ageDisplay = 'N/A';
    if (order.patient.dateOfBirth) {
      const age = calculateAge(new Date(order.patient.dateOfBirth));
      ageDisplay = `${age} Years`;
    }
    const sampleDate = new Date(order.createdAt).toLocaleDateString('en-GB');
    doc.text(`Gender: ${genderDisplay}`, boxX + 3, currentY);
    doc.text(`Age: ${ageDisplay}`, pageWidth / 2 - 10, currentY);
    doc.text(`Date of Sample Collection: ${sampleDate}`, pageWidth / 2 + 40, currentY);

    currentY += 6;
    // Third row: Referred by Dr and Contact No
    const contactNo = order.patient.phone || '-';
    doc.text(`Referred by Dr: -`, boxX + 3, currentY);
    doc.text(`Contact No: ${contactNo}`, pageWidth / 2 + 5, currentY);

    currentY = boxY + boxHeight + 8;
    
    // Test Results Section
    checkNewPage(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST RESULTS', 20, currentY);
    currentY += 15;

    for (let i = 0; i < testResults.length; i++) {
      const result = testResults[i];

      checkNewPage(60);

      // Test name and code - centered
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const testTitle = `${result.test.name} (${result.test.code})`;
      doc.text(testTitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      // Table for results
      if (result.resultData && result.resultData.length > 0) {
        checkNewPage(30);

        // Table header with borders
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setLineWidth(0.3);

        const colWidth = (pageWidth - 40) / 4;
        const tableX = 20;
        const headerHeight = 6;

        // Draw header row with borders
        doc.rect(tableX, currentY - 4, colWidth, headerHeight);
        doc.text('PARAMETER', tableX + 1, currentY, { maxWidth: colWidth - 2 });

        doc.rect(tableX + colWidth, currentY - 4, colWidth, headerHeight);
        doc.text('RESULT', tableX + colWidth + 1, currentY, { maxWidth: colWidth - 2 });

        doc.rect(tableX + colWidth * 2, currentY - 4, colWidth, headerHeight);
        doc.text('UNIT', tableX + colWidth * 2 + 1, currentY, { maxWidth: colWidth - 2 });

        doc.rect(tableX + colWidth * 3, currentY - 4, colWidth, headerHeight);
        doc.text('REFERENCE RANGE', tableX + colWidth * 3 + 1, currentY, { maxWidth: colWidth - 2 });

        currentY += 8;

        // Table data with borders
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        for (const param of result.resultData) {
          checkNewPage(8);

          const rowHeight = 6;

          // Parameter cell
          doc.rect(tableX, currentY - 4, colWidth, rowHeight);
          doc.text(param.parameter, tableX + 1, currentY, { maxWidth: colWidth - 2 });

          // Result cell
          doc.rect(tableX + colWidth, currentY - 4, colWidth, rowHeight);
          doc.text(param.value, tableX + colWidth + 1, currentY, { maxWidth: colWidth - 2 });

          // Unit cell
          doc.rect(tableX + colWidth * 2, currentY - 4, colWidth, rowHeight);
          doc.text(param.unit || '-', tableX + colWidth * 2 + 1, currentY, { maxWidth: colWidth - 2 });

          // Range cell
          doc.rect(tableX + colWidth * 3, currentY - 4, colWidth, rowHeight);
          doc.text(param.normalRange || '-', tableX + colWidth * 3 + 1, currentY, { maxWidth: colWidth - 2 });

          currentY += rowHeight;
        }

        currentY += 5;
      }

      // Comments
      if (result.comments) {
        checkNewPage(20);
        currentY += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Comments:', 20, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        const commentLines = doc.splitTextToSize(result.comments, 150);
        doc.text(commentLines, 20, currentY);

        currentY += commentLines.length * 6 + 5;
      }

      // Separator between tests
      if (i < testResults.length - 1) {
        currentY += 10;
        checkNewPage(15);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 10;
      }
    }
    
    // Add footer to last page
    addFooter();

    // Convert PDF to base64
    const pdfBase64 = doc.output('datauristring');
    
    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `report_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`
    });

  } catch (error: unknown) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}