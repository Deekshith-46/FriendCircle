require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/admin/AdminUser');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/admin_db';

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash('12345678', 10);

    // Create admin
    const admin = await AdminUser.create({
      name: 'Admin',
      email: 'admin@gmail.com',
      passwordHash,
      phone: '1234567890',
      isActive: true
    });

    console.log('Admin created successfully:', admin);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
