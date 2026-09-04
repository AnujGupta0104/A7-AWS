const express = require('express');
const { verifyToken, verifyRole } = require('../middleware/auth');
const { runQuery, getOne, getAll } = require('../config/database');

const router = express.Router();

// Get Agency Dashboard
router.get('/dashboard', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    const agencyId = req.user.id;

    // Get procurements
    const procurements = await getAll(
      'SELECT id, cropType, quantity, pricePerUnit, deadline, status, createdAt FROM procurements WHERE agencyId = ? ORDER BY createdAt DESC',
      [agencyId]
    );

    // Get farmers
    const farmers = await getAll(
      'SELECT id, name, phone, address, city, state FROM users WHERE userType = "farmer" LIMIT 10'
    );

    // Get recent notifications
    const notifications = await getAll(
      'SELECT id, title, message, read FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 5',
      [agencyId]
    );

    res.json({
      stats: {
        totalProcurements: procurements.length,
        openProcurements: procurements.filter(p => p.status === 'open').length,
        totalFarmers: farmers.length
      },
      procurements,
      farmers,
      notifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Procurement
router.post('/procurements', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    const { cropType, quantity, quantityUnit, pricePerUnit, deadline, description, location } = req.body;

    if (!cropType || !quantity || !pricePerUnit || !deadline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const agencyName = await getOne('SELECT name FROM users WHERE id = ?', [req.user.id]);

    const result = await runQuery(
      `INSERT INTO procurements (agencyId, agencyName, cropType, quantity, quantityUnit, pricePerUnit, deadline, description, location) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, agencyName.name, cropType, quantity, quantityUnit || 'quintal', pricePerUnit, deadline, description || null, location || null]
    );

    const procurement = await getOne('SELECT * FROM procurements WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Procurement created successfully',
      procurement
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Agency Procurements
router.get('/procurements', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    const procurements = await getAll(
      'SELECT id, cropType, quantity, quantityUnit, pricePerUnit, deadline, status, description, location, createdAt FROM procurements WHERE agencyId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    res.json({ procurements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Procurement Details
router.get('/procurements/:id', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    const procurement = await getOne(
      'SELECT * FROM procurements WHERE id = ? AND agencyId = ?',
      [req.params.id, req.user.id]
    );

    if (!procurement) {
      return res.status(404).json({ error: 'Procurement not found' });
    }

    res.json({ procurement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Procurement
router.put('/procurements/:id', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    const { cropType, quantity, quantityUnit, pricePerUnit, deadline, status, description, location } = req.body;

    await runQuery(
      `UPDATE procurements SET cropType = ?, quantity = ?, quantityUnit = ?, pricePerUnit = ?, deadline = ?, status = ?, description = ?, location = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ? AND agencyId = ?`,
      [cropType, quantity, quantityUnit, pricePerUnit, deadline, status, description, location, req.params.id, req.user.id]
    );

    const procurement = await getOne('SELECT * FROM procurements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Procurement updated successfully', procurement });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Procurement
router.delete('/procurements/:id', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    await runQuery('DELETE FROM procurements WHERE id = ? AND agencyId = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Procurement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Farmers List
router.get('/farmers', verifyToken, verifyRole(['agency']), async (req, res) => {
  try {
    const farmers = await getAll(
      'SELECT id, name, email, phone, address, city, state, createdAt FROM users WHERE userType = "farmer" ORDER BY createdAt DESC'
    );

    res.json({ farmers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
