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
            'materialName', 'lotNumber',
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

        // Vehicle number is optional, but set to empty string if not provided
        if (!slabData.dispatchVehicleNumber) {
            slabData.dispatchVehicleNumber = '';
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

// DELETE /api/slabs/clear-by-date-range - Delete slab measurements by date range
router.delete('/clear-by-date-range', requireRole('admin'), async(req, res) => {
    try {
        const { startDate, endDate, dateField = 'createdAt' } = req.query;

        // Validate required parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                message: 'Both startDate and endDate are required',
                example: 'DELETE /api/slabs/clear-by-date-range?startDate=2024-01-01&endDate=2024-01-31'
            });
        }

        // Validate date field
        const validDateFields = ['createdAt', 'dispatchTimestamp', 'updatedAt'];
        if (!validDateFields.includes(dateField)) {
            return res.status(400).json({
                message: 'Invalid dateField. Must be one of: createdAt, dispatchTimestamp, updatedAt',
                provided: dateField
            });
        }

        // Parse and validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                message: 'Invalid date format. Use YYYY-MM-DD format',
                provided: { startDate, endDate }
            });
        }

        if (start >= end) {
            return res.status(400).json({
                message: 'startDate must be before endDate',
                provided: { startDate, endDate }
            });
        }

        // Set end date to end of day to be inclusive
        end.setHours(23, 59, 59, 999);

        console.log(`Admin ${req.user.username} requesting deletion of slabs from ${start.toISOString()} to ${end.toISOString()} by ${dateField}`);

        // Build query based on date field
        const query = {
            [dateField]: {
                $gte: start,
                $lte: end
            }
        };

        // First, get count of records that would be deleted for confirmation
        const countToDelete = await SlabMeasurement.countDocuments(query);

        if (countToDelete === 0) {
            return res.json({
                message: 'No slab measurements found in the specified date range',
                deletedCount: 0,
                dateRange: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    dateField
                }
            });
        }

        // Delete the records
        const result = await SlabMeasurement.deleteMany(query);

        console.log(`Successfully deleted ${result.deletedCount} slab measurements by date range`);

        res.json({
            message: `Successfully deleted ${result.deletedCount} slab measurements from date range`,
            deletedCount: result.deletedCount,
            dateRange: {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                dateField
            }
        });
    } catch (error) {
        console.error('Error deleting slab measurements by date range:', error);
        res.status(500).json({
            message: 'Error deleting slab measurements by date range',
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

// GET /api/slabs/next-dispatch-code/:year/:month - Generate next dispatch code for lot number
router.get('/next-dispatch-code/:year/:month', async(req, res) => {
    try {
        const { year, month } = req.params;

        // Validate year and month
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);

        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ message: 'Invalid year or month provided' });
        }

        // Create month prefix (YYYYMM format)
        const monthPrefix = `${yearNum}${monthNum.toString().padStart(2, '0')}`;

        // Find the latest lot number for this month
        const latestSlab = await SlabMeasurement.findOne({
            lotNumber: { $regex: `^${monthPrefix}-`, $options: 'i' }
        }).sort({ createdAt: -1 });

        let nextDispatchCode = 1;

        if (latestSlab && latestSlab.lotNumber) {
            // Extract the dispatch code from the lot number (format: YYYYMM-XXX)
            const lotParts = latestSlab.lotNumber.split('-');
            if (lotParts.length >= 2) {
                const lastCode = parseInt(lotParts[1]);
                if (!isNaN(lastCode)) {
                    nextDispatchCode = lastCode + 1;
                }
            }
        }

        // Format the dispatch code with leading zeros (3 digits)
        const formattedCode = nextDispatchCode.toString().padStart(3, '0');
        const nextLotNumber = `${monthPrefix}-${formattedCode}`;

        res.json({
            nextDispatchCode,
            nextLotNumber,
            monthPrefix
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error generating next dispatch code',
            error: error.message
        });
    }
});

// GET /api/slabs/dispatch/:dispatchId - Get all slabs for a specific dispatch ID
router.get('/dispatch/:dispatchId', async(req, res) => {
    try {
        const { dispatchId } = req.params;

        if (!dispatchId) {
            return res.status(400).json({ message: 'Dispatch ID is required' });
        }

        // Find all slabs for this dispatch, sorted by slab number
        const slabs = await SlabMeasurement.find({
            dispatchId: dispatchId
        }).sort({ slabNumber: 1 }); // Sort by slab number ascending

        if (!slabs || slabs.length === 0) {
            return res.status(404).json({ message: 'No slabs found for this dispatch ID' });
        }

        // Calculate totals
        const totalSlabs = slabs.length;
        const totalNetArea = slabs.reduce((sum, slab) => sum + (slab.netArea || 0), 0);

        res.json({
            dispatchId,
            slabs,
            totalSlabs,
            totalNetArea,
            // Include dispatch info from the first slab
            dispatchInfo: {
                dispatchTimestamp: slabs[0].dispatchTimestamp,
                materialName: slabs[0].materialName,
                lotNumber: slabs[0].lotNumber,
                partyName: slabs[0].partyName,
                supervisorName: slabs[0].supervisorName,
                vehicleNumber: slabs[0].dispatchVehicleNumber,
                measurementUnit: slabs[0].measurementUnit,
                thickness: slabs[0].thickness
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching slabs for dispatch',
            error: error.message
        });
    }
});

module.exports = router;