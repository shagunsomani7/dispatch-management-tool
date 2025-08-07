const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const { authMiddleware, requireRole } = require('./authRoutes');

// Protect all routes
router.use(authMiddleware);

// GET /api/parties - List all parties (for autocomplete)
router.get('/', async(req, res) => {
    try {
        const q = req.query.q || '';
        const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
        const parties = await Party.find(filter).sort({ name: 1 });
        res.json(parties);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching parties', error: error.message });
    }
});

// GET /api/parties/:id - Get a specific party
router.get('/:id', requireRole('admin'), async(req, res) => {
    try {
        const party = await Party.findById(req.params.id);
        if (!party) {
            return res.status(404).json({ message: 'Party not found' });
        }
        res.json(party);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching party', error: error.message });
    }
});

// POST /api/parties - Add a new party
router.post('/', requireRole('admin'), async(req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Party name is required' });
        const existing = await Party.findOne({ name: name.trim() });
        if (existing) return res.status(400).json({ message: 'Party already exists' });
        const party = new Party({ name: name.trim() });
        await party.save();
        res.status(201).json(party);
    } catch (error) {
        res.status(400).json({ message: 'Error creating party', error: error.message });
    }
});

// PUT /api/parties/:id - Update a party
router.put('/:id', requireRole('admin'), async(req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Party name is required' });
        
        // Check if party exists
        const existingParty = await Party.findById(req.params.id);
        if (!existingParty) {
            return res.status(404).json({ message: 'Party not found' });
        }
        
        // Check if new name conflicts with another party
        const nameConflict = await Party.findOne({ 
            name: name.trim(), 
            _id: { $ne: req.params.id } 
        });
        if (nameConflict) {
            return res.status(400).json({ message: 'Party name already exists' });
        }
        
        const party = await Party.findByIdAndUpdate(
            req.params.id,
            { name: name.trim() },
            { new: true, runValidators: true }
        );
        res.json(party);
    } catch (error) {
        res.status(400).json({ message: 'Error updating party', error: error.message });
    }
});

// DELETE /api/parties/:id - Delete a party
router.delete('/:id', requireRole('admin'), async(req, res) => {
    try {
        const party = await Party.findByIdAndDelete(req.params.id);
        if (!party) {
            return res.status(404).json({ message: 'Party not found' });
        }
        res.json({ message: 'Party deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting party', error: error.message });
    }
});

module.exports = router;