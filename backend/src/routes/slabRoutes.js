const express = require('express');
const router = express.Router();
const SlabMeasurement = require('../models/SlabMeasurement');
const { authMiddleware, requireRole } = require('./authRoutes');

// Protect all routes
router.use(authMiddleware);

// GET /api/slabs - Get all slab measurements with filtering
router.get('/', requireRole('admin'), async(req, res) => {
    try {
        const {
            page = 1,
                limit = 10,
                partyName,
                materialName,
                supervisorName,
                startDate,
                endDate,
                lotNumber,
                vehicleNumber
        } = req.query;

        // Build filter object
        const filter = {};

        if (partyName) filter.partyName = { $regex: partyName, $options: 'i' };
        if (materialName) filter.materialName = { $regex: materialName, $options: 'i' };
        if (supervisorName) filter.supervisorName = { $regex: supervisorName, $options: 'i' };
        if (lotNumber) filter.lotNumber = { $regex: lotNumber, $options: 'i' };
        if (vehicleNumber) filter.dispatchVehicleNumber = { $regex: vehicleNumber, $options: 'i' };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const slabs = await SlabMeasurement.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await SlabMeasurement.countDocuments(filter);

        res.json({
            slabs,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching slabs', error: error.message });
    }
});

// POST /api/slabs - Create a new slab measurement
router.post('/', async(req, res) => {
    try {
        const slabData = req.body;

        // Validate required fields
        const requiredFields = [
            'dispatchId', 'dispatchTimestamp',
            'materialName', 'lotNumber', 'dispatchVehicleNumber',
            'supervisorName', 'partyName', 'slabNumber',
            'thickness', 'length', 'height', 'measurementUnit'
        ];

        for (const field of requiredFields) {
            if (!slabData[field]) {
                return res.status(400).json({
                    message: `Missing required field: ${field}`
                });
            }
        }

        const slab = new SlabMeasurement(slabData);
        const savedSlab = await slab.save();

        res.status(201).json({
            message: 'Slab measurement created successfully',
            slab: savedSlab
        });
    } catch (error) {
        res.status(400).json({
            message: 'Error creating slab measurement',
            error: error.message
        });
    }
});

// GET /api/slabs/:id - Get a specific slab measurement
router.get('/:id', async(req, res) => {
    try {
        const slab = await SlabMeasurement.findById(req.params.id);

        if (!slab) {
            return res.status(404).json({ message: 'Slab measurement not found' });
        }

        res.json(slab);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching slab measurement',
            error: error.message
        });
    }
});

// PUT /api/slabs/:id - Update a slab measurement
router.put('/:id', async(req, res) => {
    try {
        const slab = await SlabMeasurement.findByIdAndUpdate(
            req.params.id,
            req.body, { new: true, runValidators: true }
        );

        if (!slab) {
            return res.status(404).json({ message: 'Slab measurement not found' });
        }

        res.json({
            message: 'Slab measurement updated successfully',
            slab
        });
    } catch (error) {
        res.status(400).json({
            message: 'Error updating slab measurement',
            error: error.message
        });
    }
});

// DELETE /api/slabs/:id - Delete a slab measurement
router.delete('/:id', requireRole('admin'), async(req, res) => {
    try {
        const slab = await SlabMeasurement.findByIdAndDelete(req.params.id);

        if (!slab) {
            return res.status(404).json({ message: 'Slab measurement not found' });
        }

        res.json({ message: 'Slab measurement deleted successfully' });
    } catch (error) {
        res.status(500).json({
            message: 'Error deleting slab measurement',
            error: error.message
        });
    }
});

// DELETE /api/slabs/clear-all - Delete all slab measurements
router.delete('/clear-all', requireRole('admin'), async(req, res) => {
    try {
        const result = await SlabMeasurement.deleteMany({});

        res.json({
            message: 'All slab measurements cleared successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error clearing all slab measurements',
            error: error.message
        });
    }
});

// GET /api/slabs/next-slab-number/:lotNumber - Get next slab number for a lot
router.get('/next-slab-number/:lotNumber', async(req, res) => {
    try {
        const lastSlab = await SlabMeasurement.findOne({
            lotNumber: req.params.lotNumber
        }).sort({ slabNumber: -1 });

        const nextSlabNumber = lastSlab ? lastSlab.slabNumber + 1 : 1;

        res.json({ nextSlabNumber });
    } catch (error) {
        res.status(500).json({
            message: 'Error getting next slab number',
            error: error.message
        });
    }
});

// GET /api/slabs/last-slab/:lotNumber - Get last slab for copying measurements
router.get('/last-slab/:lotNumber', async(req, res) => {
    try {
        const lastSlab = await SlabMeasurement.findOne({
            lotNumber: req.params.lotNumber
        }).sort({ slabNumber: -1 });

        if (!lastSlab) {
            return res.status(404).json({ message: 'No previous slab found for this lot' });
        }

        res.json(lastSlab);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching last slab',
            error: error.message
        });
    }
});

module.exports = router;