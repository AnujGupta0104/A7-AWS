const express = require('express');
const { verifyToken, verifyRole } = require('../middleware/auth');
const { runQuery, getOne, getAll } = require('../config/database');

const router = express.Router();

// Get Farmer Dashboard
router.get('/dashboard', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const farmerId = req.user.id;

    // Get crops
    const crops = await getAll(
      'SELECT id, cropName, area, expectedYield, sowingDate, status FROM crops WHERE farmerId = ? ORDER BY createdAt DESC',
      [farmerId]
    );

    // Get prices
    const prices = await getAll('SELECT cropName, pricePerUnit, unit FROM prices LIMIT 5');

    // Get available procurements
    const procurements = await getAll(
      'SELECT id, agencyName, cropType, quantity, pricePerUnit, deadline, status FROM procurements WHERE status = "open" ORDER BY deadline ASC LIMIT 10'
    );

    // Get grievances
    const grievances = await getAll(
      'SELECT id, subject, status, priority, createdAt FROM grievances WHERE farmerId = ? ORDER BY createdAt DESC LIMIT 5',
      [farmerId]
    );

    // Get notifications
    const notifications = await getAll(
      'SELECT id, title, message, read FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 5',
      [farmerId]
    );

    res.json({
      stats: {
        activeCrops: crops.filter(c => c.status === 'active').length,
        totalCrops: crops.length,
        openGrievances: grievances.filter(g => g.status === 'open').length,
        availableProcurements: procurements.length
      },
      crops,
      prices,
      procurements,
      grievances,
      notifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Crop
router.post('/crops', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const { cropName, area, expectedYield, sowingDate, variety, notes } = req.body;

    if (!cropName || !area || !sowingDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await runQuery(
      `INSERT INTO crops (farmerId, cropName, area, expectedYield, sowingDate, variety, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, cropName, area, expectedYield || null, sowingDate, variety || null, notes || null]
    );

    const crop = await getOne('SELECT * FROM crops WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Crop added successfully',
      crop
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Farmer's Crops
router.get('/crops', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const crops = await getAll(
      'SELECT id, cropName, area, expectedYield, sowingDate, status, variety, createdAt FROM crops WHERE farmerId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    res.json({ crops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Crop Details
router.get('/crops/:id', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const crop = await getOne(
      'SELECT * FROM crops WHERE id = ? AND farmerId = ?',
      [req.params.id, req.user.id]
    );

    if (!crop) {
      return res.status(404).json({ error: 'Crop not found' });
    }

    res.json({ crop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Crop
router.put('/crops/:id', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const { cropName, area, expectedYield, status, variety, notes } = req.body;

    await runQuery(
      `UPDATE crops SET cropName = ?, area = ?, expectedYield = ?, status = ?, variety = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ? AND farmerId = ?`,
      [cropName, area, expectedYield, status, variety, notes, req.params.id, req.user.id]
    );

    const crop = await getOne('SELECT * FROM crops WHERE id = ?', [req.params.id]);
    res.json({ message: 'Crop updated successfully', crop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Prices
router.get('/prices', verifyToken, async (req, res) => {
  try {
    const prices = await getAll('SELECT cropName, pricePerUnit, unit, lastUpdated FROM prices');
    res.json({ prices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Available Procurements
router.get('/procurements', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const { cropType } = req.query;
    let query = 'SELECT id, agencyId, agencyName, cropType, quantity, quantityUnit, pricePerUnit, deadline, status, description, location, createdAt FROM procurements WHERE status = "open"';
    const params = [];

    if (cropType) {
      query += ' AND cropType = ?';
      params.push(cropType);
    }

    query += ' ORDER BY deadline ASC';
    const procurements = await getAll(query, params);
    res.json({ procurements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File Grievance
router.post('/grievances', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const { subject, description, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description required' });
    }

    const result = await runQuery(
      `INSERT INTO grievances (farmerId, subject, description, priority) VALUES (?, ?, ?, ?)`,
      [req.user.id, subject, description, priority || 'medium']
    );

    const grievance = await getOne('SELECT * FROM grievances WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Grievance filed successfully', grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Grievances
router.get('/grievances', verifyToken, verifyRole(['farmer']), async (req, res) => {
  try {
    const grievances = await getAll(
      'SELECT id, subject, description, status, priority, resolvedAt, createdAt FROM grievances WHERE farmerId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    res.json({ grievances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Notifications
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const notifications = await getAll(
      'SELECT id, type, title, message, read, createdAt FROM notifications WHERE userId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark Notification as Read
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    await runQuery('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
