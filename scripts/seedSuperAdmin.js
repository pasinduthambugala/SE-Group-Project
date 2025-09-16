// scripts/seedSuperAdmin.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// import the model directly
const User = require(path.resolve(__dirname, '../models/User'));

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/yourdb';
    await mongoose.connect(uri, { autoIndex: true });
    console.log('Mongo connected');

    // ensure unique indexes exist before insert
    await User.syncIndexes();

    const email = 'root@admin.lk';
    const exists = await User.findOne({ email });

    if (!exists) {
      await User.create({
        name: 'Root Admin',
        nic: '999999999V',
        role: 'super admin',
        address: 'HQ',
        birthday: new Date('1990-01-01'),
        email,
        telephoneNo: '+94770000000',
        password: 'ChangeMeNow123!',
      });
      console.log('✅ Seeded super admin root@admin.lk / ChangeMeNow123!');
    } else {
      console.log('ℹ️  Super admin already exists');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
