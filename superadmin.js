const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');
const connectDB = require('./config/db');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ email: 'saurabh@ycis.com' });
    if (existingAdmin) {
      console.log('Super admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create super admin
    const superAdmin = new User({
      name: 'Saurabh Shinde',
      phone: '8668428513',
      email: 'shindesaurabh0321@gmail.com',
      studentId: 'ADMIN001',
      phone: "8668428513",
      password: '8668428513',
      role: 'admin'
    });

    await superAdmin.save();
    console.log('Super admin seeded successfully:', superAdmin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();