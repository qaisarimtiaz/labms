export type ReportFormatType =
  | 'standard'
  | 'ana-23'
  | 'ana-mi2'
  | 'ena'
  | 'autoimmune-liver'
  | 'myopathies'
  | 'myopathies-hmgcr'
  | 'neuronal-profile'
  | 'paraneoplastic-profile'
  | 'systemic-sclerosis';

export interface ReportFormatConfig {
  name: string;
  description: string;
  templateFile?: string;
}

export const REPORT_FORMATS: Record<ReportFormatType, ReportFormatConfig> = {
  'standard': {
    name: 'Standard Report Format',
    description: 'Default format for most laboratory tests'
  },
  'ana-23': {
    name: 'ANA Profile 23 Format',
    description: 'Specialized format for ANA Profile 23 IgG testing',
    templateFile: 'REPORTING FORMAT ANA 23.docx'
  },
  'ana-mi2': {
    name: 'ANA MI2 Format',
    description: 'Specialized format for ANA MI2 testing',
    templateFile: 'REPORTING FORMAT ANA MI2.docx'
  },
  'ena': {
    name: 'ENA Profile Format',
    description: 'Specialized format for Extractable Nuclear Antigens testing',
    templateFile: 'REPORTING FORMAT ENA.docx'
  },
  'autoimmune-liver': {
    name: 'Autoimmune Liver Disease Format',
    description: 'Specialized format for autoimmune liver disease testing',
    templateFile: 'REPORTING FORMAT autoimmune liver disease.docx'
  },
  'myopathies': {
    name: 'Myopathies/Myositis Format',
    description: 'Specialized format for myopathies and myositis testing',
    templateFile: 'REPORTING FORMAT mayopathies.docx'
  },
  'myopathies-hmgcr': {
    name: 'Myopathies HMGCR Format',
    description: 'Specialized format for myopathies with HMGCR testing',
    templateFile: 'REPORTING FORMAT mayopathies HMGCR.docx'
  },
  'neuronal-profile': {
    name: 'Neuronal Profile Format',
    description: 'Specialized format for neuronal antigens profile testing',
    templateFile: 'REPORTING FORMAT neuronal profile.docx'
  },
  'paraneoplastic-profile': {
    name: 'Paraneoplastic Profile Format',
    description: 'Specialized format for paraneoplastic neurologic syndromes',
    templateFile: 'REPORTING FORMAT Paraneoplastic Profile.docx'
  },
  'systemic-sclerosis': {
    name: 'Systemic Sclerosis Format',
    description: 'Specialized format for systemic sclerosis testing',
    templateFile: 'REPORTING FORMAT systemic sclerosis.docx'
  }
};

export interface TestResultData {
  parameter: string;
  value: string;
  unit?: string;
  normalRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

export interface TestResultInfo {
  test: {
    code: string;
    name: string;
    reportFormat?: string;
  };
  overallStatus: 'normal' | 'abnormal' | 'critical';
  resultData: TestResultData[];
  comments?: string;
}

export interface PatientInfo {
  firstName: string;
  lastName: string;
  patientId?: string;
}

export interface OrderInfo {
  orderNumber: string;
  createdAt: Date;
  patient: PatientInfo;
}

export function getReportFormat(formatType?: string): ReportFormatType {
  if (!formatType || !REPORT_FORMATS[formatType as ReportFormatType]) {
    return 'standard';
  }
  return formatType as ReportFormatType;
}

export function getFormatConfig(formatType: ReportFormatType): ReportFormatConfig {
  return REPORT_FORMATS[formatType];
}
