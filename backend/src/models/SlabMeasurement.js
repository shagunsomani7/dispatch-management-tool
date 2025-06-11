const mongoose = require('mongoose');

const cornerDeductionSchema = new mongoose.Schema({
    length: {
        type: Number,
        required: true,
        min: 0
    },
    height: {
        type: Number,
        required: true,
        min: 0
    },
    area: {
        type: Number,
        required: true,
        min: 0
    }
});

const slabMeasurementSchema = new mongoose.Schema({
    materialName: {
        type: String,
        required: true,
        trim: true
    },
    lotNumber: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    dispatchVehicleNumber: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    supervisorName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    partyName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    slabNumber: {
        type: Number,
        required: true,
        min: 1
    },
    thickness: {
        type: Number,
        required: true,
        min: 0
    },
    length: {
        type: Number,
        required: true,
        min: 0
    },
    height: {
        type: Number,
        required: true,
        min: 0
    },
    cornerDeductions: [cornerDeductionSchema],
    measurementUnit: {
        type: String,
        required: true,
        enum: ['inches', 'cm', 'mm'],
        default: 'mm'
    },
    grossArea: {
        type: Number,
        required: true,
        min: 0
    },
    totalDeductionArea: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    netArea: {
        type: Number,
        required: true,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
slabMeasurementSchema.index({ createdAt: -1 });
slabMeasurementSchema.index({ partyName: 1, createdAt: -1 });
slabMeasurementSchema.index({ materialName: 1, createdAt: -1 });
slabMeasurementSchema.index({ supervisorName: 1, createdAt: -1 });

// Pre-save middleware to calculate areas
slabMeasurementSchema.pre('save', function(next) {
    // Calculate gross area
    this.grossArea = this.length * this.height;

    // Calculate total deduction area
    this.totalDeductionArea = this.cornerDeductions.reduce((total, corner) => {
        corner.area = corner.length * corner.height;
        return total + corner.area;
    }, 0);

    // Calculate net area
    this.netArea = this.grossArea - this.totalDeductionArea;

    // Update timestamp
    this.updatedAt = new Date();

    next();
});

// Virtual for formatted date
slabMeasurementSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString();
});

// Method to convert units
slabMeasurementSchema.methods.convertToUnit = function(targetUnit) {
    const conversions = {
        'mm': { 'cm': 0.1, 'inches': 0.0393701 },
        'cm': { 'mm': 10, 'inches': 0.393701 },
        'inches': { 'mm': 25.4, 'cm': 2.54 }
    };

    if (this.measurementUnit === targetUnit) {
        return this;
    }

    const factor = conversions[this.measurementUnit][targetUnit];
    if (!factor) {
        throw new Error(`Cannot convert from ${this.measurementUnit} to ${targetUnit}`);
    }

    return {
        ...this.toObject(),
        length: this.length * factor,
        height: this.height * factor,
        thickness: this.thickness * factor,
        grossArea: this.grossArea * factor * factor,
        totalDeductionArea: this.totalDeductionArea * factor * factor,
        netArea: this.netArea * factor * factor,
        measurementUnit: targetUnit,
        cornerDeductions: this.cornerDeductions.map(corner => ({
            ...corner.toObject(),
            length: corner.length * factor,
            height: corner.height * factor,
            area: corner.area * factor * factor
        }))
    };
};

module.exports = mongoose.model('SlabMeasurement', slabMeasurementSchema);