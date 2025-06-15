const express = require('express');
const router = express.Router();
const Party = require('../models/Party');

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

// POST /api/parties - Add a new party
router.post('/', async(req, res) => {
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

module.exports = router;