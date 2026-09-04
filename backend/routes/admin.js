const express = require('express');
const { verifyToken, verifyRole } = require('../middleware/auth');
const { runQuery, getOne, getAll } = require('../config/database');

const router = express.Router();

// Get Admin Dashboard
router.get('/dashboard', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const users = await getAll('SELECT COUNT(*) as count FROM users');
    const farmers = await getAll('SELECT COUNT(*) as count FROM users WHERE userType = "farmer"');
    const agencies = await getAll('SELECT COUNT(*) as count FROM users WHERE userType = "agency"');
    const grievances = await getAll('SELECT COUNT(*) as count FROM grievances');
    const openGrievances = await getAll('SELECT COUNT(*) as count FROM grievances WHERE status = "open"');
    const procurements = await getAll('SELECT COUNT(*) as count FROM procurements');

    res.json({
      stats: {
        totalUsers: users[0]?.count || 0,
        totalFarmers: farmers[0]?.count || 0,
        totalAgencies: agencies[0]?.count || 0,
        totalGrievances: grievances[0]?.count || 0,
        openGrievances: openGrievances[0]?.count || 0,
        totalProcurements: procurements[0]?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Users
router.get('/users', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const users = await getAll(
      'SELECT id, email, name, userType, phone, city, state, isActive, createdAt FROM users ORDER BY createdAt DESC'
    );

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Grievances
router.get('/grievances', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const grievances = await getAll(
      `SELECT g.id, g.subject, g.description, g.status, g.priority, g.createdAt, u.name as farmerName, u.email as farmerEmail 
       FROM grievances g 
       JOIN users u ON g.farmerId = u.id 
       ORDER BY g.createdAt DESC`
    );

    res.json({ grievances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Grievance Details
router.get('/grievances/:id', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const grievance = await getOne(
      `SELECT g.*, u.name as farmerName, u.email as farmerEmail, u.phone as farmerPhone 
       FROM grievances g 
       JOIN users u ON g.farmerId = u.id 
       WHERE g.id = ?`,
      [req.params.id]
    );

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Grievance Status
router.put('/grievances/:id', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { status, resolution } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await runQuery(
      `UPDATE grievances SET status = ?, resolution = ?, resolvedBy = ?, resolvedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, resolution || null, req.user.id, req.params.id]
    );

    const grievance = await getOne('SELECT * FROM grievances WHERE id = ?', [req.params.id]);
    res.json({ message: 'Grievance updated successfully', grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate User
router.put('/users/:id/deactivate', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    await runQuery('UPDATE users SET isActive = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate User
router.put('/users/:id/activate', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    await runQuery('UPDATE users SET isActive = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User activated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Price
router.post('/prices', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { cropName, pricePerUnit, unit, source } = req.body;

    if (!cropName || !pricePerUnit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if price exists
    const existing = await getOne('SELECT id FROM prices WHERE cropName = ?', [cropName]);

    if (existing) {
      await runQuery(
        'UPDATE prices SET pricePerUnit = ?, unit = ?, source = ?, lastUpdated = CURRENT_TIMESTAMP WHERE cropName = ?',
        [pricePerUnit, unit || 'per quintal', source || null, cropName]
      );
    } else {
      await runQuery(
        'INSERT INTO prices (cropName, pricePerUnit, unit, source) VALUES (?, ?, ?, ?)',
        [cropName, pricePerUnit, unit || 'per quintal', source || null]
      );
    }

    const price = await getOne('SELECT * FROM prices WHERE cropName = ?', [cropName]);
    res.json({ message: 'Price updated successfully', price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Prices
router.get('/prices', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const prices = await getAll('SELECT id, cropName, pricePerUnit, unit, source, lastUpdated FROM prices');
    res.json({ prices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
