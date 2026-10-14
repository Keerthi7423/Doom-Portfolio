import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/user.model.js';

const seedAdmin = async () => {
  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas.');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@doom.dev';
    const adminPassword = process.env.ADMIN_PASSWORD || 'DoomImperial2026!';

    // Guard: Prevent duplicate accounts
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️ Sovereign Admin (${adminEmail}) already exists. Skipping.`);
      process.exit(0);
    }

    // Creates user (userSchema.pre('save') automatically hashes password with bcrypt cost 12)
    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'sovereign',
    });

    console.log(`⚔️ Sovereign Admin forged successfully!`);
    console.log(`   - Email: ${admin.email}`);
    console.log(`   - Role:  ${admin.role}`);
    console.log(`   - ID:    ${admin._id}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed sovereign admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
