const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

// Add text index for searching
materialSchema.index({ name: 'text' });

module.exports = mongoose.model('Material', materialSchema);