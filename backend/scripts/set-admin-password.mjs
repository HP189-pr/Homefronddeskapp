#!/usr/bin/env node
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sequelize } from '../db.mjs';
import { User } from '../models/user.mjs';

// Resolve backend .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const passwordArg = process.argv[2];
    const ADMIN_PW = passwordArg || process.env.ADMIN_PW;
    if (!ADMIN_PW) {
      console.error('No password provided. Pass as argument or set ADMIN_PW in backend/.env');
      process.exit(2);
    }

    const hash = await bcrypt.hash(ADMIN_PW, 10);

    const admin = await User.findOne({ where: { userid: 'admin' } });
    if (!admin) {
      console.error("Admin user (userid='admin') not found. Consider running seed-admin.mjs first.");
      process.exit(3);
    }

    admin.usrpassword = hash;
    await admin.save();

    console.log('Admin password updated for userid=admin');
    process.exit(0);
  } catch (err) {
    console.error('Error updating admin password:', err?.message || err);
    process.exit(1);
  }
}

run();
