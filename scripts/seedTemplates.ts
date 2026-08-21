import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error('Usage: npx tsx scripts/seedTemplates.ts "mongodb+srv://..."');
  console.error('Or set MONGODB_URI in .env.local');
  process.exit(1);
}

// ── Schema (inline to avoid Next.js module resolution) ─────────────────────
const ParameterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  unit: { type: String, trim: true, default: '' },
  referenceRange: { type: String, trim: true, default: '' },
  minReferenceRange: { type: String, trim: true, default: '' },
  maxReferenceRange: { type: String, trim: true, default: '' },
  sequenceOrder: { type: Number, default: 0 }
}, { _id: true });

const TestTemplateSchema = new mongoose.Schema({
  templateName: { type: String, required: true, unique: true, trim: true },
  category: { type: String, trim: true, default: '' },
  parameters: { type: [ParameterSchema], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const TestTemplate = mongoose.models.TestTemplate ||
  mongoose.model('TestTemplate', TestTemplateSchema);

// ── Template data extracted from PDFs ──────────────────────────────────────
const templates = [
  {
    templateName: 'ANA Profile 23 Ag',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Nucleosomes',  referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'dsDNA',        referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'Histones',     referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'SS-A',         referenceRange: '76–96' },
      { name: 'Ro-52',        referenceRange: '28–32' },
      { name: 'SS-B',         referenceRange: '32–36' },
      { name: 'RNP/Sm',       referenceRange: '40-75' },
      { name: 'Sm',           referenceRange: '20-50' },
      { name: 'Mi-2 alpha',   referenceRange: '1-6' },
      { name: 'Mi-2 beta',    referenceRange: '1-6' },
      { name: 'Ku',           referenceRange: '150-450' },
      { name: 'CENP A',       referenceRange: '' },
      { name: 'CENP B',       referenceRange: '' },
      { name: 'Sp100',        referenceRange: '' },
      { name: 'PML',          referenceRange: '' },
      { name: 'Scl-70',       referenceRange: '' },
      { name: 'PM-Scl 100',   referenceRange: '' },
      { name: 'PM-Scl 75',    referenceRange: '' },
      { name: 'RP11',         referenceRange: '' },
      { name: 'RP155',        referenceRange: '' },
      { name: 'GP210',        referenceRange: '' },
      { name: 'PCNA',         referenceRange: '' },
      { name: 'DFS70',        referenceRange: '' },
      { name: 'Control Band', referenceRange: '' },
    ]
  },
  {
    templateName: 'ANA Profile 18 Ag',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Mi-2',         referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'Ku',           referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'nRNP/Sm',      referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'Sm',           referenceRange: '76–96' },
      { name: 'SS-A',         referenceRange: '28–32' },
      { name: 'Ro-52',        referenceRange: '32–36' },
      { name: 'SS-B',         referenceRange: '40-75' },
      { name: 'Scl-70',       referenceRange: '20-50' },
      { name: 'PM-Scl 100',   referenceRange: '1-6' },
      { name: 'Jo-1',         referenceRange: '1-6' },
      { name: 'CEN B',        referenceRange: '150-450' },
      { name: 'CEN A',        referenceRange: '' },
      { name: 'PCNA',         referenceRange: '' },
      { name: 'dsDNA',        referenceRange: '' },
      { name: 'Nucleosomes',  referenceRange: '' },
      { name: 'Histones',     referenceRange: '' },
      { name: 'Rib. P',       referenceRange: '' },
      { name: 'AMA M2',       referenceRange: '' },
      { name: 'DFS70',        referenceRange: '' },
      { name: 'Control',      referenceRange: '' },
    ]
  },
  {
    templateName: 'Autoimmune Liver Disease Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'AMA-M2',        referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'M2-3E',         referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'SP100',         referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'PML',           referenceRange: '76–96' },
      { name: 'GP210',         referenceRange: '28–32' },
      { name: 'LKM-1',         referenceRange: '32–36' },
      { name: 'LC-1',          referenceRange: '40-75' },
      { name: 'SLA/LP',        referenceRange: '20-50' },
      { name: 'F-Actin',       referenceRange: '' },
      { name: 'Ro-52',         referenceRange: '' },
      { name: 'Control Band',  referenceRange: '' },
    ]
  },
  {
    templateName: 'ENA Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'nRNP/Sm',      referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'Sm',           referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'SS-A',         referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'Ro-52',        referenceRange: '76–96' },
      { name: 'SS-B',         referenceRange: '28–32' },
      { name: 'Scl-70',       referenceRange: '32–36' },
      { name: 'Jo-1',         referenceRange: '40-75' },
      { name: 'Control Band', referenceRange: '20-50' },
    ]
  },
  {
    templateName: 'Myositis / Myopathies Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Mi-2 alpha',   referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'Mi-2 beta',    referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'TIF 1g',       referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'MDAS',         referenceRange: '76–96' },
      { name: 'NXP2',         referenceRange: '28–32' },
      { name: 'SAE1',         referenceRange: '32–36' },
      { name: 'Ku',           referenceRange: '40-75' },
      { name: 'PM-Scl 100',   referenceRange: '20-50' },
      { name: 'PM-Scl 75',    referenceRange: '' },
      { name: 'Jo-1',         referenceRange: '' },
      { name: 'SRP',          referenceRange: '' },
      { name: 'PL-7',         referenceRange: '' },
      { name: 'PL-12',        referenceRange: '' },
      { name: 'EJ',           referenceRange: '' },
      { name: 'OJ',           referenceRange: '' },
      { name: 'Ro-52',        referenceRange: '' },
      { name: 'Control Band', referenceRange: '' },
    ]
  },
  {
    templateName: 'Myositis / Myopathies with HMGCR Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Mi-2 alpha',   referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'Mi-2 beta',    referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'TIF 1g',       referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'MDAS',         referenceRange: '76–96' },
      { name: 'NXP2',         referenceRange: '28–32' },
      { name: 'SAE1',         referenceRange: '32–36' },
      { name: 'Ku',           referenceRange: '40-75' },
      { name: 'PM-Scl 100',   referenceRange: '20-50' },
      { name: 'PM-Scl 75',    referenceRange: '' },
      { name: 'Jo-1',         referenceRange: '' },
      { name: 'SRP',          referenceRange: '' },
      { name: 'PL-7',         referenceRange: '' },
      { name: 'PL-12',        referenceRange: '' },
      { name: 'EJ',           referenceRange: '' },
      { name: 'OJ',           referenceRange: '' },
      { name: 'Ro-52',        referenceRange: '' },
      { name: 'CN-1A',        referenceRange: '' },
      { name: 'HMGCR',        referenceRange: '' },
      { name: 'Control Band', referenceRange: '' },
    ]
  },
  {
    templateName: 'Neuronal Antigens Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Amphiphysin',  referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'CV2',          referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'PNMA2',        referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'Ma-2/Ta',      referenceRange: '76–96' },
      { name: 'Ri',           referenceRange: '28–32' },
      { name: 'Yo',           referenceRange: '32–36' },
      { name: 'Hu',           referenceRange: '40-75' },
      { name: 'recoverin',    referenceRange: '20-50' },
      { name: 'SOX1',         referenceRange: '' },
      { name: 'Titin',        referenceRange: '' },
      { name: 'Control Band', referenceRange: '' },
    ]
  },
  {
    templateName: 'Paraneoplastic Syndrome Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Amphiphysin',  referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'CV2',          referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'PNMA2',        referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'Ma-2/Ta',      referenceRange: '76–96' },
      { name: 'Ri',           referenceRange: '28–32' },
      { name: 'Yo',           referenceRange: '32–36' },
      { name: 'Hu',           referenceRange: '40-75' },
      { name: 'recoverin',    referenceRange: '20-50' },
      { name: 'SOX1',         referenceRange: '' },
      { name: 'Titin',        referenceRange: '' },
      { name: 'Zic4',         referenceRange: '' },
      { name: 'GAD65',        referenceRange: '' },
      { name: 'Tr (DNER)',    referenceRange: '' },
      { name: 'Control Band', referenceRange: '' },
    ]
  },
  {
    templateName: 'Systemic Sclerosis Profile',
    category: 'IMMUNOLOGY',
    parameters: [
      { name: 'Scl-70',       referenceRange: 'M (4.5–6.5) / F (3.9–5.6)' },
      { name: 'CENP A',       referenceRange: 'M (13-18) / F (11.5-16.4)' },
      { name: 'CENP B',       referenceRange: 'M (40-54) / F (34-44)' },
      { name: 'RP11',         referenceRange: '76–96' },
      { name: 'RP155',        referenceRange: '28–32' },
      { name: 'Fibrillarin',  referenceRange: '32–36' },
      { name: 'NOR90',        referenceRange: '40-75' },
      { name: 'Th/To',        referenceRange: '20-50' },
      { name: 'PM-Scl100',    referenceRange: '' },
      { name: 'PM-Scl 75',    referenceRange: '' },
      { name: 'Ku',           referenceRange: '' },
      { name: 'PDGFR',        referenceRange: '' },
      { name: 'Ro-52',        referenceRange: '' },
      { name: 'Control Band', referenceRange: '' },
    ]
  }
];

// ── Seed ───────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  let created = 0;
  let skipped = 0;

  for (const t of templates) {
    const existing = await TestTemplate.findOne({ templateName: t.templateName });
    if (existing) {
      console.log(`  SKIP  "${t.templateName}" (already exists)`);
      skipped++;
      continue;
    }

    await TestTemplate.create({
      templateName: t.templateName,
      category: t.category,
      parameters: t.parameters.map((p, i) => ({
        ...p,
        unit: '',
        minReferenceRange: '',
        maxReferenceRange: '',
        sequenceOrder: i
      }))
    });

    console.log(`  OK    "${t.templateName}" — ${t.parameters.length} parameters`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
