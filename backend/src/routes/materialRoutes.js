const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const { authMiddleware } = require('./authRoutes');

// Protect all routes
router.use(authMiddleware);

// GET /api/materials - Get all materials with optional search
router.get('/', async(req, res) => {
    try {
        const { q } = req.query;
        let query = {};

        if (q) {
            query = {
                name: { $regex: q, $options: 'i' }
            };
        }

        const materials = await Material.find(query)
            .sort({ name: 1 })
            .limit(50);

        res.json(materials);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching materials',
            error: error.message
        });
    }
});

// POST /api/materials - Create a new material
router.post('/', async(req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: 'Material name is required'
            });
        }

        // Check if material already exists
        const existingMaterial = await Material.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i' }
        });

        if (existingMaterial) {
            return res.status(400).json({
                message: 'Material with this name already exists'
            });
        }

        const material = new Material({ name: name.trim() });
        const savedMaterial = await material.save();

        res.status(201).json({
            message: 'Material created successfully',
            material: savedMaterial
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({
                message: 'Material with this name already exists'
            });
        } else {
            res.status(400).json({
                message: 'Error creating material',
                error: error.message
            });
        }
    }
});

// PUT /api/materials/:id - Update a material
router.put('/:id', async(req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: 'Material name is required'
            });
        }

        // Check if another material with the same name exists
        const existingMaterial = await Material.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i' },
            _id: { $ne: req.params.id }
        });

        if (existingMaterial) {
            return res.status(400).json({
                message: 'Material with this name already exists'
            });
        }

        const material = await Material.findByIdAndUpdate(
            req.params.id, { name: name.trim() }, { new: true, runValidators: true }
        );

        if (!material) {
            return res.status(404).json({
                message: 'Material not found'
            });
        }

        res.json({
            message: 'Material updated successfully',
            material
        });
    } catch (error) {
        res.status(400).json({
            message: 'Error updating material',
            error: error.message
        });
    }
});

// DELETE /api/materials/:id - Delete a material
router.delete('/:id', async(req, res) => {
    try {
        const material = await Material.findByIdAndDelete(req.params.id);

        if (!material) {
            return res.status(404).json({
                message: 'Material not found'
            });
        }

        res.json({
            message: 'Material deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error deleting material',
            error: error.message
        });
    }
});

module.exports = router;