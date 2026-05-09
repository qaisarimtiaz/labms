import jsPDF from 'jspdf';
import { ReportFormatType, TestResultInfo, OrderInfo } from './reportFormats';

export interface PDFRenderContext {
  doc: jsPDF;
  currentY: number;
  pageWidth: number;
  pageHeight: number;
  testResult: TestResultInfo;
  order: OrderInfo;
  addNewPage?: () => number; // Optional callback to add a new page with header/footer
}

export interface PDFRenderer {
  renderTestResult: (context: PDFRenderContext) => number;
}

// Standard format renderer (default for most tests)
export const standardFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    // Test name - simple
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const testTitle = `${testResult.test.name} (${testResult.test.code})`;
    const splitTestTitle = doc.splitTextToSize(testTitle, pageWidth - 50);
    doc.text(splitTestTitle, 20, currentY);

    currentY += Math.max(8, splitTestTitle.length * 6);

    // Status
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);

    currentY += 10;

    // Simple table
    if (testResult.resultData && testResult.resultData.length > 0) {
      // Table header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Parameter', 20, currentY);
      doc.text('Result', 80, currentY);
      doc.text('Unit', 110, currentY);
      doc.text('Range', 130, currentY);
      doc.text('Flag', 170, currentY);

      // Line under header
      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      // Table data
      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page (leave 30mm margin at bottom)
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw table header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Parameter', 20, currentY);
          doc.text('Result', 80, currentY);
          doc.text('Unit', 110, currentY);
          doc.text('Range', 130, currentY);
          doc.text('Flag', 170, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        // Parameter name
        const paramText = doc.splitTextToSize(param.parameter, 55);
        doc.text(paramText, 20, currentY);

        // Result value
        doc.text(param.value, 80, currentY);

        // Unit
        doc.text(param.unit || '-', 110, currentY);

        // Range
        doc.text(param.normalRange || '-', 130, currentY);

        // Flag
        const flag = param.flag?.toUpperCase() || 'NORMAL';
        doc.text(flag, 170, currentY);

        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Comments
    if (testResult.comments) {
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);

      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// ANA-23 format renderer
export const ana23FormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    // Enhanced header for ANA-23
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ANA PROFILE 23 IgG - IMMUNOBLOT ANALYSIS', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    const testTitle = `${testResult.test.name} (${testResult.test.code})`;
    const splitTestTitle = doc.splitTextToSize(testTitle, pageWidth - 50);
    doc.text(splitTestTitle, 20, currentY);
    currentY += Math.max(8, splitTestTitle.length * 6);

    // Status with color coding
    doc.setFont('helvetica', 'normal');
    doc.text(`Overall Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    // Enhanced table for ANA-23 with specific antigens
    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Antigen', 20, currentY);
      doc.text('Result', 90, currentY);
      doc.text('Interpretation', 120, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page (leave 30mm margin at bottom)
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw table header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Antigen', 20, currentY);
          doc.text('Result', 90, currentY);
          doc.text('Interpretation', 120, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 65);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 90, currentY);

        // Add interpretation based on flag
        const interpretation = param.flag === 'normal' ? 'Negative' : 'Positive';
        doc.text(interpretation, 120, currentY);

        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    // Clinical significance section for ANA-23
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'ANA Profile 23 detects antibodies against 23 different nuclear antigens. Positive results may indicate autoimmune conditions such as SLE, Sjögren\'s syndrome, scleroderma, or mixed connective tissue disease.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    // Comments
    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Additional Comments:', 20, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// ENA format renderer
export const enaFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ENA PROFILE - EXTRACTABLE NUCLEAR ANTIGENS', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    const testTitle = `${testResult.test.name} (${testResult.test.code})`;
    doc.text(testTitle, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('ENA Specificity', 20, currentY);
      doc.text('Result', 90, currentY);
      doc.text('Reference', 130, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('ENA Specificity', 20, currentY);
          doc.text('Result', 90, currentY);
          doc.text('Reference', 130, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        doc.text(param.parameter, 20, currentY);
        doc.text(param.value, 90, currentY);
        doc.text(param.normalRange || 'Negative', 130, currentY);
        currentY += 6;
      }

      currentY += 5;
    }

    // Clinical significance
    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'ENA antibodies are associated with various connective tissue diseases. Sm and dsDNA are specific for SLE, Ro/La for Sjögren\'s syndrome, Scl-70 for scleroderma, and Jo-1 for polymyositis.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Myopathies format renderer
export const myopathiesFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MYOSITIS/MYOPATHIES ANTIBODY PROFILE', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.text(`${testResult.test.name} (${testResult.test.code})`, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Myositis-Specific Antibody', 20, currentY);
      doc.text('Result', 110, currentY);
      doc.text('Interpretation', 140, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Myositis-Specific Antibody', 20, currentY);
          doc.text('Result', 110, currentY);
          doc.text('Interpretation', 140, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 85);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 110, currentY);

        const interpretation = param.flag === 'normal' ? 'Not Detected' : 'Detected';
        doc.text(interpretation, 140, currentY);

        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'Myositis-specific antibodies are markers for idiopathic inflammatory myopathies including dermatomyositis, polymyositis, and necrotizing myopathy. Detection helps in diagnosis and classification.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Myopathies HMGCR format renderer (variant with specific HMGCR focus)
export const myopathiesHmgcrFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MYOPATHIES PROFILE INCLUDING HMGCR', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.text(`${testResult.test.name} (${testResult.test.code})`, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Antibody', 20, currentY);
      doc.text('Result', 110, currentY);
      doc.text('Reference', 140, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Antibody', 20, currentY);
          doc.text('Result', 110, currentY);
          doc.text('Reference', 140, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 85);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 110, currentY);
        doc.text(param.normalRange || 'Negative', 140, currentY);
        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'Anti-HMGCR antibodies are associated with statin-associated and necrotizing autoimmune myopathy. This profile helps distinguish immune-mediated necrotizing myopathy from other inflammatory myopathies.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Neuronal Profile format renderer
export const neuronalProfileFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NEURONAL ANTIGENS ANTIBODY PROFILE', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.text(`${testResult.test.name} (${testResult.test.code})`, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Neuronal Antibody', 20, currentY);
      doc.text('Result', 110, currentY);
      doc.text('Clinical Association', 145, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Neuronal Antibody', 20, currentY);
          doc.text('Result', 110, currentY);
          doc.text('Clinical Association', 145, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 85);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 110, currentY);
        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'Neuronal antibodies are associated with autoimmune neurological disorders including encephalitis, cerebellar degeneration, and other neurological syndromes. Early detection is crucial for treatment.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Paraneoplastic Profile format renderer
export const paraneoplasticProfileFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PARANEOPLASTIC NEUROLOGIC SYNDROMES PROFILE', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.text(`${testResult.test.name} (${testResult.test.code})`, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Paraneoplastic Antibody', 20, currentY);
      doc.text('Result', 110, currentY);
      doc.text('Associated Malignancy', 140, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Paraneoplastic Antibody', 20, currentY);
          doc.text('Result', 110, currentY);
          doc.text('Associated Malignancy', 140, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 85);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 110, currentY);
        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'Paraneoplastic antibodies are markers of immune-mediated neurological disorders associated with underlying malignancy. Detection may prompt cancer screening and guide treatment decisions.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Systemic Sclerosis format renderer
export const systemicSclerosisFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SYSTEMIC SCLEROSIS ANTIBODY PROFILE', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.text(`${testResult.test.name} (${testResult.test.code})`, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Scleroderma Antibody', 20, currentY);
      doc.text('Result', 110, currentY);
      doc.text('Clinical Subset', 140, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Scleroderma Antibody', 20, currentY);
          doc.text('Result', 110, currentY);
          doc.text('Clinical Subset', 140, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 85);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 110, currentY);
        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'Systemic sclerosis antibodies help classify disease subsets and predict organ involvement. Anti-Scl-70 is associated with diffuse cutaneous disease and pulmonary fibrosis, while anti-centromere suggests limited cutaneous disease.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Autoimmune Liver format renderer
export const autoimmuneLiverFormatRenderer: PDFRenderer = {
  renderTestResult: (context: PDFRenderContext) => {
    const { doc, testResult, pageWidth } = context;
    let currentY = context.currentY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTOIMMUNE LIVER DISEASE ANTIBODY PROFILE', pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;

    doc.setFontSize(11);
    doc.text(`${testResult.test.name} (${testResult.test.code})`, 20, currentY);
    currentY += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${testResult.overallStatus.toUpperCase()}`, 20, currentY);
    currentY += 12;

    if (testResult.resultData && testResult.resultData.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Liver Antibody', 20, currentY);
      doc.text('Result', 110, currentY);
      doc.text('Disease Association', 140, currentY);

      currentY += 5;
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      for (const param of testResult.resultData) {
        // Check if we need a new page
        if (currentY > context.pageHeight - 30) {
          if (context.addNewPage) {
            currentY = context.addNewPage();
          } else {
            doc.addPage();
            currentY = 20;
          }

          // Redraw header on new page
          doc.setFont('helvetica', 'bold');
          doc.text('Liver Antibody', 20, currentY);
          doc.text('Result', 110, currentY);
          doc.text('Disease Association', 140, currentY);
          currentY += 5;
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
        }

        const paramText = doc.splitTextToSize(param.parameter, 85);
        doc.text(paramText, 20, currentY);
        doc.text(param.value, 110, currentY);
        currentY += Math.max(6, paramText.length * 6);
      }

      currentY += 5;
    }

    // Check before clinical significance section
    if (currentY > context.pageHeight - 50) {
      if (context.addNewPage) {
        currentY = context.addNewPage();
      } else {
        doc.addPage();
        currentY = 20;
      }
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Significance:', 20, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const clinicalText = 'Autoimmune liver antibodies help diagnose and classify autoimmune hepatitis, primary biliary cholangitis, and primary sclerosing cholangitis. Detection aids in determining treatment strategy.';
    const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
    doc.text(clinicalLines, 20, currentY);
    currentY += clinicalLines.length * 5 + 5;

    if (testResult.comments) {
      currentY += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const commentLines = doc.splitTextToSize(testResult.comments, 150);
      doc.text(commentLines, 20, currentY);
      currentY += commentLines.length * 6 + 5;
    }

    return currentY;
  }
};

// Format renderer registry
export const formatRenderers: Record<ReportFormatType, PDFRenderer> = {
  'standard': standardFormatRenderer,
  'ana-23': ana23FormatRenderer,
  'ana-mi2': ana23FormatRenderer, // Uses same format as ANA-23
  'ena': enaFormatRenderer,
  'autoimmune-liver': autoimmuneLiverFormatRenderer,
  'myopathies': myopathiesFormatRenderer,
  'myopathies-hmgcr': myopathiesHmgcrFormatRenderer,
  'neuronal-profile': neuronalProfileFormatRenderer,
  'paraneoplastic-profile': paraneoplasticProfileFormatRenderer,
  'systemic-sclerosis': systemicSclerosisFormatRenderer
};

export function getRenderer(formatType?: string): PDFRenderer {
  if (!formatType || !formatRenderers[formatType as ReportFormatType]) {
    return standardFormatRenderer;
  }
  return formatRenderers[formatType as ReportFormatType];
}
