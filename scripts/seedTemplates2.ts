import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error('Usage: npx tsx scripts/seedTemplates2.ts "mongodb+srv://..."');
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

const LabTestSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true, default: '' },
  type: { type: String, trim: true, default: '' },
  reportFormat: { type: String, trim: true, default: 'standard' },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'TestTemplate', default: null }
}, { timestamps: true });

const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', LabTestSchema);

// ── Template data reconstructed from actual technician-entered results ─────
// (the cleanest / most complete result set per test, cross-checked for
// consistency across repeated entries)
const templates = [
  {
    templateName: 'CBC (Complete Blood Count)',
    category: 'HEAMATOLOGY',
    linkCode: 'HEM-T06',
    parameters: [
      { name: 'Hb', unit: 'g/dl', referenceRange: '11 - 15' },
      { name: 'RBC', unit: 'x10^12/l', referenceRange: '4.2 - 5.4' },
      { name: 'HCT', unit: '%', referenceRange: '37 - 47' },
      { name: 'MCV', unit: 'fl', referenceRange: '78 - 100' },
      { name: 'MCH', unit: 'pg', referenceRange: '25 - 32' },
      { name: 'MCHC', unit: 'g/dl', referenceRange: '30 - 34' },
      { name: 'RDW CV %', unit: '%', referenceRange: '11.5 - 14.5' },
      { name: 'Platelet Count', unit: 'x10^9/l', referenceRange: '150 - 430' },
      { name: 'MPV', unit: 'fl', referenceRange: '7 - 11' },
      { name: 'WBC Count (TLC)', unit: 'x10^9/l', referenceRange: '5 - 11' },
      { name: 'Neutrophils', unit: '%', referenceRange: '40 - 75' },
      { name: 'Lymphocytes', unit: '%', referenceRange: '20 - 50' },
      { name: 'Monocytes', unit: '%', referenceRange: '2 - 10' },
      { name: 'Eosinophils', unit: '%', referenceRange: '1 - 6' },
      { name: 'Abs. Neutrophils', unit: 'x10^9/l', referenceRange: '2.0 - 7.0' },
      { name: 'Abs. Lymphocytes', unit: 'x10^9/l', referenceRange: '1.00 - 3.0' },
      { name: 'Abs. Monocytes', unit: 'x10^9/l', referenceRange: 'Less Than 1.00' },
      { name: 'Abs. Eosinophils', unit: 'x10^9/l', referenceRange: 'Less Than 1.00' },
    ]
  },
  {
    templateName: "LFT's (Liver Function Test)",
    category: 'BIO-CHEMISTRY',
    linkCode: 'BIO-LFT-O1',
    parameters: [
      { name: 'Serum Total Bilirubin', unit: 'mg/dL', referenceRange: '0.1 - 1.2' },
      { name: 'Serum Conjugated Bilirubin', unit: 'mg/dL', referenceRange: 'Less Than 0.3' },
      { name: 'Serum Unconjugated Bilirubin', unit: 'mg/dL', referenceRange: '0.1 - 1.0' },
      { name: 'Serum ALT (SGPT)', unit: 'U/L', referenceRange: 'Less Than 45' },
      { name: 'Serum AST (SGOT)', unit: 'U/L', referenceRange: 'Less Than 35' },
      { name: 'Serum Alkaline Phosphatase', unit: 'U/L', referenceRange: '50 - 116' },
      { name: 'Serum Gamma GT', unit: 'U/L', referenceRange: 'Less Than 59' },
      { name: 'Serum Total Protein', unit: 'g/dL', referenceRange: '6.0 - 8.5' },
      { name: 'Serum Albumin', unit: 'g/dL', referenceRange: '3.5 - 5.0' },
      { name: 'Serum Globulins', unit: 'g/dL', referenceRange: '1.8 - 3.5' },
      { name: 'A/G Ratio', unit: '', referenceRange: '1.0 - 2.2' },
    ]
  },
  {
    templateName: 'Lipid Profile',
    category: 'BIO-CHEMISTRY',
    linkCode: 'BIO-T11',
    parameters: [
      { name: 'Total Cholesterol', unit: 'mg/dl', referenceRange: 'Less Than 200' },
      { name: 'Triglycerides', unit: 'mg/dl', referenceRange: 'Less Than 150' },
      { name: 'HDL Cholesterol', unit: 'mg/dl', referenceRange: 'Greater Than 40' },
      { name: 'LDL Cholesterol', unit: 'mg/dl', referenceRange: 'Less Than 100' },
      { name: 'VLDL', unit: 'mg/dl', referenceRange: '2 - 30' },
      { name: 'Non-HDL Cholesterol', unit: 'mg/dl', referenceRange: 'Less Than 130' },
    ]
  },
  {
    templateName: 'Electrolytes',
    category: 'BIO-CHEMISTRY',
    linkCode: 'OS-T14',
    parameters: [
      { name: 'Serum Sodium', unit: 'mmol/L', referenceRange: '136 - 145' },
      { name: 'Serum Potassium', unit: 'mmol/L', referenceRange: '3.5 - 5.1' },
      { name: 'Serum Chloride', unit: 'mmol/L', referenceRange: '98 - 107' },
      { name: 'Serum Bicarbonate', unit: 'mmol/L', referenceRange: '22 - 29' },
    ]
  },
  {
    templateName: 'Urine DR (Detailed Routine)',
    category: '',
    linkCode: 'OS-T34',
    parameters: [
      { name: 'Volume', unit: 'ml', referenceRange: '' },
      { name: 'Colour', unit: '', referenceRange: '' },
      { name: 'Sp. Gravity', unit: '', referenceRange: '1.015 - 1.035' },
      { name: 'pH', unit: '', referenceRange: '5.0 - 7.0' },
      { name: 'Albumin', unit: '', referenceRange: 'Negative' },
      { name: 'Bilirubin', unit: '', referenceRange: 'Negative' },
      { name: 'Ketone Bodies', unit: '', referenceRange: 'Negative' },
      { name: 'Glucose', unit: '', referenceRange: 'Negative' },
      { name: 'Nitrate', unit: '', referenceRange: 'Negative' },
      { name: 'Urobilinogen', unit: '', referenceRange: 'Normal' },
      { name: 'Hemoglobin', unit: '', referenceRange: 'Negative' },
      { name: 'RBC', unit: '/HPF', referenceRange: 'Less Than 6' },
      { name: 'WBC', unit: '/HPF', referenceRange: '0 - 5' },
      { name: 'Squamous Epithelial Cells', unit: '/HPF', referenceRange: '' },
      { name: 'Bacteria', unit: '/HPF', referenceRange: '' },
    ]
  },
  {
    templateName: 'Gangliosides Profile IgG',
    category: 'IMMUNOLOGY',
    linkCode: 'IMM-GGS-01',
    parameters: [
      { name: 'GM1', unit: '-', referenceRange: '0-5' },
      { name: 'GM2', unit: '-', referenceRange: '0-5' },
      { name: 'GM3', unit: '-', referenceRange: '0-5' },
      { name: 'GD1a', unit: '-', referenceRange: '0-5' },
      { name: 'GD1b', unit: '-', referenceRange: '0-5' },
      { name: 'GT1b', unit: '-', referenceRange: '0-5' },
      { name: 'GQ1b', unit: '-', referenceRange: '0-5' },
    ]
  },
  {
    templateName: 'Gangliosides Profile IgM',
    category: 'IMMUNOLOGY',
    linkCode: 'IMM-GGS-02',
    parameters: [
      { name: 'GM1', unit: '-', referenceRange: '0-5' },
      { name: 'GM2', unit: '-', referenceRange: '0-5' },
      { name: 'GM3', unit: '-', referenceRange: '0-5' },
      { name: 'GD1a', unit: '-', referenceRange: '0-5' },
      { name: 'GD1b', unit: '-', referenceRange: '0-5' },
      { name: 'GT1b', unit: '-', referenceRange: '0-5' },
      { name: 'GQ1b', unit: '-', referenceRange: '0-5' },
    ]
  },
  {
    templateName: 'Autoimmune Encephalitis Profile IFA',
    category: 'IMMUNOLOGY',
    linkCode: 'IMM-ENC-01',
    parameters: [
      { name: 'NMDA', unit: '-', referenceRange: 'Negative' },
      { name: 'AMPA1', unit: '-', referenceRange: 'Negative' },
      { name: 'AMPA2', unit: '-', referenceRange: 'Negative' },
      { name: 'CASPR2', unit: '-', referenceRange: 'Negative' },
      { name: 'LGI1', unit: '-', referenceRange: 'Negative' },
      { name: 'GABA B', unit: '-', referenceRange: 'Negative' },
    ]
  },
  {
    templateName: 'IgG Index',
    category: 'IMMUNOLOGY',
    linkCode: 'OS-T38',
    parameters: [
      { name: 'IgG Index Ratio', unit: '', referenceRange: '0.23 - 0.64' },
      { name: 'Serum Albumin', unit: 'g/L', referenceRange: '38 - 54' },
      { name: 'Serum IgG', unit: 'g/L', referenceRange: '5.52 - 6.31' },
      { name: 'CSF Albumin', unit: 'mg/L', referenceRange: '16 - 160' },
      { name: 'CSF IgG', unit: 'mg/L', referenceRange: '18 - 180' },
    ]
  },
  {
    templateName: 'ANA IFA (ANA, ASMA, AMA)',
    category: 'IMMUNOLOGY',
    linkCode: 'IMM-ANA-01',
    parameters: [
      { name: 'ANA', unit: '-', referenceRange: 'Negative' },
      { name: 'ASMA', unit: '-', referenceRange: 'Negative' },
      { name: 'AMA', unit: '-', referenceRange: 'Negative' },
    ]
  },
  {
    templateName: 'Malaria Ag (PV/PF)',
    category: 'PARASITOLOGY',
    linkCode: 'VIR-MA-01',
    parameters: [
      { name: 'P. vivax (PV)', unit: '-', referenceRange: 'Negative' },
      { name: 'P. falciparum (PF)', unit: '-', referenceRange: 'Negative' },
    ]
  },
];

// Tests that already match an existing template 1:1 (from seedTemplates.ts)
// — link directly instead of duplicating.
const directLinks: { code: string; templateName: string }[] = [
  { code: 'IMM-ANA-03', templateName: 'ANA Profile 18 Ag' }, // ANA Profile 18 IgG
];

// ── Seed ───────────────────────────────────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const t of templates) {
    let templateId: mongoose.Types.ObjectId;
    const existing = await TestTemplate.findOne({ templateName: t.templateName });
    if (existing) {
      console.log(`  SKIP  "${t.templateName}" (already exists)`);
      templateId = existing._id;
      skipped++;
    } else {
      const doc = await TestTemplate.create({
        templateName: t.templateName,
        category: t.category,
        parameters: t.parameters.map((p, i) => ({
          ...p,
          minReferenceRange: '',
          maxReferenceRange: '',
          sequenceOrder: i
        }))
      });
      templateId = doc._id;
      console.log(`  OK    "${t.templateName}" — ${t.parameters.length} parameters`);
      created++;
    }

    const result = await LabTest.updateMany(
      { code: t.linkCode, template: null },
      { $set: { template: templateId } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  LINK  ${t.linkCode} -> "${t.templateName}"`);
      linked += result.modifiedCount;
    }
  }

  for (const dl of directLinks) {
    const tmpl = await TestTemplate.findOne({ templateName: dl.templateName });
    if (!tmpl) {
      console.log(`  SKIP link "${dl.code}" — template "${dl.templateName}" not found`);
      continue;
    }
    const result = await LabTest.updateMany(
      { code: dl.code, template: null },
      { $set: { template: tmpl._id } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  LINK  ${dl.code} -> "${dl.templateName}" (existing template)`);
      linked += result.modifiedCount;
    }
  }

  console.log(`\nDone. Templates created: ${created}, skipped: ${skipped}. Lab tests linked: ${linked}.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
