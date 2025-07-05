const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to verify JWT and attach user to req
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

// Middleware to check for required role
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
}

// Register a new user (backend only)
router.post('/register', async(req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, password, and role are required.' });
        }
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ message: 'Username already exists.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, role });
        await user.save();
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
});

// Login
router.post('/login', async(req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid username or password.' });
        }
        const token = jwt.sign({ userId: user._id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async(req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            user: {
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching user',
            error: error.message
        });
    }
});

// List all users (admin only)
router.get('/users', authMiddleware, requireRole('admin'), async(req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
});

// Update user role and/or password (admin only)
router.put('/users/:id', authMiddleware, requireRole('admin'), async(req, res) => {
    try {
        const { role, password } = req.body;
        const update = {};
        if (role) update.role = role;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            update.password = hashedPassword;
        }
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: '-password' });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Error updating user', error: err.message });
    }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;