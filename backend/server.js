const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Import routes
const slabRoutes = require('./src/routes/slabRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const authRoutes = require('./src/routes/authRoutes');
const partyRoutes = require('./src/routes/partyRoutes');
const materialRoutes = require('./src/routes/materialRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://192.168.29.193:3000',
        'https://dispatch-management-tool-frontend.onrender.com'
    ],
    credentials: true
}));
app.options('*', cors({
    origin: [
        'http://localhost:3000',
        'http://192.168.29.193:3000',
        'https://dispatch-management-tool-frontend.onrender.com'
    ],
    credentials: true
}))

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/slabs', slabRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/materials', materialRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Dispatch Measurement API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'API endpoint not found'
    });
});

// Database connection
const connectDB = async() => {
    try {
        // Default to MongoDB Atlas connection string format
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatch_measurement';

        console.log('🔄 Connecting to MongoDB...');
        console.log('📍 Connection URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
        console.log('📊 Database:', mongoose.connection.name);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('\n🔧 Solutions:');
        console.log('1. Use MongoDB Atlas (cloud) - recommended for MVP');
        console.log('   • Sign up at: https://www.mongodb.com/atlas');
        console.log('   • Create cluster and get connection string');
        console.log('   • Update MONGODB_URI in .env file');
        console.log('\n2. Install MongoDB locally:');
        console.log('   • Download from: https://www.mongodb.com/try/download/community');
        console.log('   • Start with: mongod');
        console.log('\nServer will continue without database connection for now...');

        // Don't exit - let server run for testing API endpoints
        console.log('⚠️  Running in NO-DATABASE mode for API testing');
    }
};

// Start server
const startServer = async() => {
    // Try to connect to database but don't fail if it's not available
    await connectDB();

    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 Server Status:');
        console.log(`   Port: ${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Local API URL: http://localhost:${PORT}/api`);
        console.log(`   Network API URL: http://192.168.29.193:${PORT}/api`);
        console.log(`   Health Check: http://localhost:${PORT}/api/health`);
        console.log(`   Network Health Check: http://192.168.29.193:${PORT}/api/health`);
        console.log(`   Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️  Disconnected'}`);

        if (mongoose.connection.readyState !== 1) {
            console.log('\n💡 To enable database functionality:');
            console.log('   1. Set up MongoDB Atlas: https://www.mongodb.com/atlas');
            console.log('   2. Update MONGODB_URI in .env file');
            console.log('   3. Restart the server');
        }
    });
};

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});