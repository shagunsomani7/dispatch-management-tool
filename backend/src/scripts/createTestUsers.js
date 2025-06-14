const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const testUsers = [{
        username: 'admin',
        password: 'admin123',
        role: 'admin'
    },
    {
        username: 'supervisor',
        password: 'supervisor123',
        role: 'supervisor'
    }
];

async function createTestUsers() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatch_measurement';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create new users
        for (const user of testUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await User.create({
                username: user.username,
                password: hashedPassword,
                role: user.role
            });
            console.log(`Created user: ${user.username}`);
        }

        console.log('Test users created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating test users:', error);
        process.exit(1);
    }
}

createTestUsers();