const express = require('express');
const router = express.Router();
const SlabMeasurement = require('../models/SlabMeasurement');

// GET /api/reports/analytics - Get analytics data
router.get('/analytics', async(req, res) => {
    try {
        const { startDate, endDate, groupBy = 'daily' } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // Basic analytics
        const totalSlabs = await SlabMeasurement.countDocuments(dateFilter);
        const totalAreaResult = await SlabMeasurement.aggregate([
            { $match: dateFilter },
            { $group: { _id: null, totalArea: { $sum: "$netArea" } } }
        ]);

        const totalArea = totalAreaResult[0] ? totalAreaResult[0].totalArea : 0;

        // Party-wise breakdown
        const partyBreakdown = await SlabMeasurement.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$partyName",
                    count: { $sum: 1 },
                    totalArea: { $sum: "$netArea" }
                }
            },
            { $sort: { totalArea: -1 } }
        ]);

        // Material-wise breakdown
        const materialBreakdown = await SlabMeasurement.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$materialName",
                    count: { $sum: 1 },
                    totalArea: { $sum: "$netArea" }
                }
            },
            { $sort: { totalArea: -1 } }
        ]);

        // Supervisor performance
        const supervisorPerformance = await SlabMeasurement.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$supervisorName",
                    count: { $sum: 1 },
                    totalArea: { $sum: "$netArea" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            summary: {
                totalSlabs,
                totalArea,
                averageAreaPerSlab: totalSlabs > 0 ? totalArea / totalSlabs : 0
            },
            partyBreakdown,
            materialBreakdown,
            supervisorPerformance
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error generating analytics',
            error: error.message
        });
    }
});

// GET /api/reports/daily - Get daily report
router.get('/daily', async(req, res) => {
    try {
        const { date = new Date().toISOString().split('T')[0] } = req.query;

        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const slabs = await SlabMeasurement.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: -1 });

        const summary = {
            date,
            totalSlabs: slabs.length,
            totalArea: slabs.reduce((sum, slab) => sum + slab.netArea, 0),
            parties: [...new Set(slabs.map(slab => slab.partyName))].length,
            supervisors: [...new Set(slabs.map(slab => slab.supervisorName))].length
        };

        res.json({ summary, slabs });
    } catch (error) {
        res.status(500).json({
            message: 'Error generating daily report',
            error: error.message
        });
    }
});

// POST /api/reports/pdf - Generate PDF report
router.post('/pdf', async(req, res) => {
    try {
        // TODO: Implement PDF generation using Puppeteer
        res.json({
            message: 'PDF generation not implemented yet',
            data: req.body
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error generating PDF',
            error: error.message
        });
    }
});

module.exports = router;