import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Allow passing Atlas URI as command-line argument, otherwise use .env.local
const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error('Usage: npx tsx scripts/seedUsers.ts "mongodb+srv://..."');
  console.error('Or set MONGODB_URI in .env.local');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  email:     { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: '' },
  password:  { type: String, default: '' },
  role:      { type: String, enum: ['admin', 'lab_tech', 'reception', 'patient'], required: true },
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  phone:     { type: String, trim: true },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// ── Default staff accounts ─────────────────────────────────────────────────
// Change these passwords before going live in production!
const staffUsers = [
  {
    email: 'admin@healthinn.com',
    password: 'Admin@1234',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'HealthInn',
    phone: '',
  },
  {
    email: 'labtech@healthinn.com',
    password: 'LabTech@1234',
    role: 'lab_tech',
    firstName: 'Lab',
    lastName: 'Technician',
    phone: '',
  },
  {
    email: 'reception@healthinn.com',
    password: 'Reception@1234',
    role: 'reception',
    firstName: 'Front',
    lastName: 'Desk',
    phone: '',
  },
  {
    email: 'patient@healthinn.com',
    password: 'Patient@1234',
    role: 'patient',
    firstName: 'Demo',
    lastName: 'Patient',
    phone: '',
  },
];

async function seedUsers() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  for (const u of staffUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  SKIP  ${u.email} (already exists, role: ${existing.role})`);
      continue;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(u.password, salt);

    await User.create({ ...u, password: hashedPassword });
    console.log(`  OK    ${u.email} — role: ${u.role} — password: ${u.password}`);
  }

  console.log('\nDone! You can now log in with the accounts above.');
  await mongoose.disconnect();
}

seedUsers().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
