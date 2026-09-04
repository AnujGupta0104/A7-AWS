const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { runQuery, getOne } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, userType, phone, address, city, state, pincode } = req.body;

    // Validation
    if (!email || !password || !name || !userType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['farmer', 'agency', 'admin'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await runQuery(
      `INSERT INTO users (email, password, name, userType, phone, address, city, state, pincode) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, userType, phone || null, address || null, city || null, state || null, pincode || null]
    );

    const user = await getOne('SELECT id, email, name, userType FROM users WHERE id = ?', [result.id]);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await getOne('SELECT id, email, password, name, userType FROM users WHERE email = ? AND isActive = 1', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const userWithoutPassword = { id: user.id, email: user.email, name: user.name, userType: user.userType };

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Current User
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await getOne(
      'SELECT id, email, name, userType, phone, address, city, state, pincode FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, address, city, state, pincode } = req.body;

    await runQuery(
      `UPDATE users SET name = ?, phone = ?, address = ?, city = ?, state = ?, pincode = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name || null, phone || null, address || null, city || null, state || null, pincode || null, req.user.id]
    );

    const user = await getOne(
      'SELECT id, email, name, userType, phone, address, city, state, pincode FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
