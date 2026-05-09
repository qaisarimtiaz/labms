import { ReportFormatType } from './reportFormats';

export interface ParameterTemplate {
  parameter: string;
  unit?: string;
  normalRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

export const TEST_PARAMETER_TEMPLATES: Record<ReportFormatType, ParameterTemplate[]> = {
  'standard': [],

  'ana-23': [
    { parameter: 'Nucleosomes', normalRange: 'M (4.5–6.5) / F (3.9–5.6)' },
    { parameter: 'dsDNA', normalRange: 'M (13-18) / F (11.5-16.4)' },
    { parameter: 'Histones', normalRange: 'M (40-54) / F (34-44)' },
    { parameter: 'SS-A', normalRange: '76–96' },
    { parameter: 'Ro-52', normalRange: '28–32' },
    { parameter: 'SS-B', normalRange: '32–36' },
    { parameter: 'RNP/Sm', normalRange: '40-75' },
    { parameter: 'Sm', normalRange: '20-50' },
    { parameter: 'Mi-2 alpha', normalRange: '1-6' },
    { parameter: 'Mi-2 beta', normalRange: '1-6' },
    { parameter: 'Ku', normalRange: '150-450' },
    { parameter: 'CENP A', normalRange: '' },
    { parameter: 'CENP B', normalRange: '' },
    { parameter: 'Sp100', normalRange: '' },
    { parameter: 'PML', normalRange: '' },
    { parameter: 'Scl-70', normalRange: '' },
    { parameter: 'PM-Scl 100', normalRange: '' },
    { parameter: 'PM-Scl 75', normalRange: '' },
    { parameter: 'RP11', normalRange: '' },
    { parameter: 'RP155', normalRange: '' },
    { parameter: 'GP210', normalRange: '' },
    { parameter: 'PCNA', normalRange: '' },
    { parameter: 'DFS70', normalRange: '' }
  ],

  'ana-mi2': [
    { parameter: 'Mi-2', normalRange: 'M (4.5–6.5) / F (3.9–5.6)' },
    { parameter: 'Ku', normalRange: 'M (13-18) / F (11.5-16.4)' },
    { parameter: 'nRNP/Sm', normalRange: 'M (40-54) / F (34-44)' },
    { parameter: 'Sm', normalRange: '76–96' },
    { parameter: 'SS-A', normalRange: '28–32' },
    { parameter: 'Ro-52', normalRange: '32–36' },
    { parameter: 'SS-B', normalRange: '40-75' },
    { parameter: 'Scl-70', normalRange: '20-50' },
    { parameter: 'PM-Scl 100', normalRange: '1-6' },
    { parameter: 'Jo-1', normalRange: '1-6' },
    { parameter: 'CEN B', normalRange: '150-450' },
    { parameter: 'CEN A', normalRange: '' },
    { parameter: 'PCNA', normalRange: '' },
    { parameter: 'dsDNA', normalRange: '' },
    { parameter: 'Nucleosomes', normalRange: '' },
    { parameter: 'Histones', normalRange: '' },
    { parameter: 'Rib. P', normalRange: '' },
    { parameter: 'AMA M2', normalRange: '' },
    { parameter: 'DFS70', normalRange: '' },
    { parameter: 'Control', normalRange: '' }
  ],

  'ena': [
    { parameter: 'SS-A/Ro', normalRange: 'Negative' },
    { parameter: 'SS-B/La', normalRange: 'Negative' },
    { parameter: 'Sm', normalRange: 'Negative' },
    { parameter: 'RNP/Sm', normalRange: 'Negative' },
    { parameter: 'Scl-70', normalRange: 'Negative' },
    { parameter: 'Jo-1', normalRange: 'Negative' },
    { parameter: 'Centromere B', normalRange: 'Negative' },
    { parameter: 'Ribosomal P', normalRange: 'Negative' }
  ],

  'autoimmune-liver': [
    { parameter: 'ANA', normalRange: 'Negative' },
    { parameter: 'AMA-M2', normalRange: 'Negative' },
    { parameter: 'Anti-LKM-1', normalRange: 'Negative' },
    { parameter: 'Anti-LC-1', normalRange: 'Negative' },
    { parameter: 'Anti-SLA/LP', normalRange: 'Negative' },
    { parameter: 'Anti-Smooth Muscle (ASMA)', normalRange: 'Negative' },
    { parameter: 'Anti-F-Actin', normalRange: 'Negative' },
    { parameter: 'Anti-Mitochondrial M2-3E (BPO)', normalRange: 'Negative' },
    { parameter: 'Anti-gp210', normalRange: 'Negative' },
    { parameter: 'Anti-sp100', normalRange: 'Negative' }
  ],

  'myopathies': [
    { parameter: 'Mi-2 alpha', normalRange: 'Negative' },
    { parameter: 'Mi-2 beta', normalRange: 'Negative' },
    { parameter: 'TIF1-gamma', normalRange: 'Negative' },
    { parameter: 'MDA5', normalRange: 'Negative' },
    { parameter: 'NXP2', normalRange: 'Negative' },
    { parameter: 'SAE1', normalRange: 'Negative' },
    { parameter: 'Jo-1', normalRange: 'Negative' },
    { parameter: 'PL-7', normalRange: 'Negative' },
    { parameter: 'PL-12', normalRange: 'Negative' },
    { parameter: 'EJ', normalRange: 'Negative' },
    { parameter: 'OJ', normalRange: 'Negative' },
    { parameter: 'SRP', normalRange: 'Negative' }
  ],

  'myopathies-hmgcr': [
    { parameter: 'Mi-2 alpha', normalRange: 'Negative' },
    { parameter: 'Mi-2 beta', normalRange: 'Negative' },
    { parameter: 'TIF1-gamma', normalRange: 'Negative' },
    { parameter: 'MDA5', normalRange: 'Negative' },
    { parameter: 'NXP2', normalRange: 'Negative' },
    { parameter: 'SAE1', normalRange: 'Negative' },
    { parameter: 'HMGCR', normalRange: 'Negative' },
    { parameter: 'Jo-1', normalRange: 'Negative' },
    { parameter: 'PL-7', normalRange: 'Negative' },
    { parameter: 'PL-12', normalRange: 'Negative' },
    { parameter: 'EJ', normalRange: 'Negative' },
    { parameter: 'OJ', normalRange: 'Negative' },
    { parameter: 'SRP', normalRange: 'Negative' }
  ],

  'neuronal-profile': [
    { parameter: 'Hu (ANNA-1)', normalRange: 'Negative' },
    { parameter: 'Yo (PCA-1)', normalRange: 'Negative' },
    { parameter: 'Ri (ANNA-2)', normalRange: 'Negative' },
    { parameter: 'CV2/CRMP5', normalRange: 'Negative' },
    { parameter: 'Amphiphysin', normalRange: 'Negative' },
    { parameter: 'Ma2/Ta', normalRange: 'Negative' },
    { parameter: 'Recoverin', normalRange: 'Negative' },
    { parameter: 'SOX1', normalRange: 'Negative' },
    { parameter: 'Titin', normalRange: 'Negative' },
    { parameter: 'Zic4', normalRange: 'Negative' },
    { parameter: 'GAD65', normalRange: 'Negative' },
    { parameter: 'Tr (DNER)', normalRange: 'Negative' }
  ],

  'paraneoplastic-profile': [
    { parameter: 'Hu (ANNA-1)', normalRange: 'Negative' },
    { parameter: 'Yo (PCA-1)', normalRange: 'Negative' },
    { parameter: 'Ri (ANNA-2)', normalRange: 'Negative' },
    { parameter: 'CV2/CRMP5', normalRange: 'Negative' },
    { parameter: 'Amphiphysin', normalRange: 'Negative' },
    { parameter: 'Ma1', normalRange: 'Negative' },
    { parameter: 'Ma2/Ta', normalRange: 'Negative' },
    { parameter: 'Recoverin', normalRange: 'Negative' },
    { parameter: 'SOX1', normalRange: 'Negative' },
    { parameter: 'Titin', normalRange: 'Negative' },
    { parameter: 'Zic4', normalRange: 'Negative' },
    { parameter: 'GAD65', normalRange: 'Negative' },
    { parameter: 'Tr (DNER)', normalRange: 'Negative' },
    { parameter: 'ANNA-3', normalRange: 'Negative' },
    { parameter: 'PCA-2', normalRange: 'Negative' }
  ],

  'systemic-sclerosis': [
    { parameter: 'Scl-70 (Topoisomerase I)', normalRange: 'Negative' },
    { parameter: 'Centromere A', normalRange: 'Negative' },
    { parameter: 'Centromere B', normalRange: 'Negative' },
    { parameter: 'RNA Polymerase III', normalRange: 'Negative' },
    { parameter: 'Fibrillarin (U3-RNP)', normalRange: 'Negative' },
    { parameter: 'NOR-90 (hUBF)', normalRange: 'Negative' },
    { parameter: 'Th/To', normalRange: 'Negative' },
    { parameter: 'PM-Scl 100', normalRange: 'Negative' },
    { parameter: 'PM-Scl 75', normalRange: 'Negative' },
    { parameter: 'Ku', normalRange: 'Negative' },
    { parameter: 'PDGFR', normalRange: 'Negative' }
  ]
};

export function getParameterTemplate(formatType?: string): ParameterTemplate[] {
  if (!formatType || !TEST_PARAMETER_TEMPLATES[formatType as ReportFormatType]) {
    return TEST_PARAMETER_TEMPLATES['standard'];
  }
  return TEST_PARAMETER_TEMPLATES[formatType as ReportFormatType];
}
