const { runQuery, getAll } = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initializeData = async () => {
  try {
    console.log('\n🌱 Seeding database with initial data...');

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if users already exist
    const existingUsers = await getAll('SELECT COUNT(*) as count FROM users');
    
    if (existingUsers[0]?.count === 0) {
      // Insert test farmer
      await runQuery(
        `INSERT INTO users (email, password, name, userType, phone, address, city, state, pincode) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['farmer@example.com', hashedPassword, 'John Farmer', 'farmer', '9876543210', '123 Farm Lane', 'Agra', 'Uttar Pradesh', '282001']
      );

      // Insert test agency
      await runQuery(
        `INSERT INTO users (email, password, name, userType, phone, address, city, state, pincode) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['agency@example.com', hashedPassword, 'Procurement Agency', 'agency', '9123456789', '456 Agency Road', 'Delhi', 'Delhi', '110001']
      );

      // Insert test admin
      await runQuery(
        `INSERT INTO users (email, password, name, userType, phone, address, city, state, pincode) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['admin@example.com', hashedPassword, 'Admin User', 'admin', '9000000000', '789 Admin Plaza', 'Mumbai', 'Maharashtra', '400001']
      );

      console.log('✅ Test users created');
    }

    // Insert sample prices
    const existingPrices = await getAll('SELECT COUNT(*) as count FROM prices');
    if (existingPrices[0]?.count === 0) {
      const crops = [
        { name: 'Wheat', price: 2500 },
        { name: 'Rice', price: 3500 },
        { name: 'Corn', price: 1800 },
        { name: 'Cotton', price: 5500 },
        { name: 'Potato', price: 1200 }
      ];

      for (const crop of crops) {
        await runQuery(
          'INSERT INTO prices (cropName, pricePerUnit, unit) VALUES (?, ?, ?)',
          [crop.name, crop.price, 'per quintal']
        );
      }

      console.log('✅ Crop prices initialized');
    }

    console.log('\n🎉 Database seeding completed!\n');
    console.log('📝 Test Credentials:');
    console.log('   Farmer: farmer@example.com / password123');
    console.log('   Agency: agency@example.com / password123');
    console.log('   Admin:  admin@example.com / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

initializeData();
