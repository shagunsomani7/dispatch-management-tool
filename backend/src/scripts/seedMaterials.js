const mongoose = require('mongoose');
const Material = require('../models/Material');
require('dotenv').config();

const defaultMaterials = [
    'Granite Red',
    'Granite Black',
    'Granite White',
    'Granite Brown',
    'Granite Green',
    'Marble White',
    'Marble Black',
    'Marble Beige',
    'Marble Grey',
    'Quartz Premium',
    'Quartz Standard',
    'Quartz Engineered',
    'Limestone',
    'Sandstone',
    'Slate'
];

const seedMaterials = async() => {
    try {
        // Connect to database
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dispatch_measurement';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        // Check if materials already exist
        const existingCount = await Material.countDocuments();
        if (existingCount > 0) {
            console.log(`Database already has ${existingCount} materials. Skipping seed.`);
            process.exit(0);
        }

        // Create materials
        const materials = defaultMaterials.map(name => ({ name }));
        const result = await Material.insertMany(materials);

        console.log(`✅ Successfully seeded ${result.length} materials:`);
        result.forEach(material => {
            console.log(`   - ${material.name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding materials:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    seedMaterials();
}

module.exports = seedMaterials;