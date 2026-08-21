import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  console.error('Usage: npx tsx scripts/resetUsers.ts "mongodb+srv://..."');
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

const staffUsers = [
  { email: 'admin@healthinn.com',     password: 'Admin@1234',     role: 'admin',     firstName: 'Admin', lastName: 'HealthInn' },
  { email: 'labtech@healthinn.com',   password: 'LabTech@1234',   role: 'lab_tech',  firstName: 'Lab',   lastName: 'Technician' },
  { email: 'reception@healthinn.com', password: 'Reception@1234', role: 'reception', firstName: 'Front', lastName: 'Desk' },
  { email: 'patient@healthinn.com',   password: 'Patient@1234',   role: 'patient',   firstName: 'Demo',  lastName: 'Patient' },
];

async function resetUsers() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  for (const u of staffUsers) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(u.password, salt);

    const result = await User.findOneAndUpdate(
      { email: u.email },
      { $set: { password: hashedPassword, role: u.role, firstName: u.firstName, lastName: u.lastName, isActive: true } },
      { upsert: true, new: true }
    );

    console.log(`  OK    ${u.email} — role: ${u.role} — password reset to: ${u.password}`);
  }

  console.log('\nDone! All users reset. You can now log in with the passwords above.');
  await mongoose.disconnect();
}

resetUsers().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
