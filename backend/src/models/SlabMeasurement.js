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
    // Dispatch batch information
    dispatchId: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    dispatchTimestamp: {
        type: Date,
        required: true,
        index: true
    },

    // Existing fields
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
        required: false,
        trim: true,
        index: true,
        default: ''
    },
    dispatchWarehouse: {
        type: String,
        required: false,
        trim: true,
        index: true,
        default: ''
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
        enum: ['inches', 'cm'],
        default: 'inches'
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
    // Convert measurements to feet first
    const lengthInFeet = this.length * (this.measurementUnit === 'inches' ? 1 / 12 :
        this.measurementUnit === 'cm' ? 0.0328084 : 1);

    const heightInFeet = this.height * (this.measurementUnit === 'inches' ? 1 / 12 :
        this.measurementUnit === 'cm' ? 0.0328084 : 1);

    // Calculate gross area in square feet
    this.grossArea = lengthInFeet * heightInFeet;

    // Calculate total deduction area in square feet
    this.totalDeductionArea = this.cornerDeductions.reduce((total, corner) => {
        const cornerLengthInFeet = corner.length * (this.measurementUnit === 'inches' ? 1 / 12 :
            this.measurementUnit === 'cm' ? 0.0328084 : 1);

        const cornerHeightInFeet = corner.height * (this.measurementUnit === 'inches' ? 1 / 12 :
            this.measurementUnit === 'cm' ? 0.0328084 : 1);

        corner.area = cornerLengthInFeet * cornerHeightInFeet;
        return total + corner.area;
    }, 0);

    // Calculate net area in square feet
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
        'cm': { 'inches': 0.393701 },
        'inches': { 'cm': 2.54 }
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