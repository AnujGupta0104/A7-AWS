const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const initializeDatabase = () => {
  db.serialize(() => {
    // Create Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        userType TEXT NOT NULL CHECK(userType IN ('farmer', 'agency', 'admin')),
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        profileImage TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Crops Table
    db.run(`
      CREATE TABLE IF NOT EXISTS crops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmerId INTEGER NOT NULL,
        cropName TEXT NOT NULL,
        area REAL NOT NULL,
        expectedYield REAL,
        sowingDate DATE,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'harvested', 'damaged')),
        variety TEXT,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farmerId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Prices Table
    db.run(`
      CREATE TABLE IF NOT EXISTS prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cropName TEXT UNIQUE NOT NULL,
        pricePerUnit REAL NOT NULL,
        unit TEXT DEFAULT 'per quintal',
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT
      )
    `);

    // Create Procurements Table
    db.run(`
      CREATE TABLE IF NOT EXISTS procurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agencyId INTEGER NOT NULL,
        agencyName TEXT,
        cropType TEXT NOT NULL,
        quantity REAL NOT NULL,
        quantityUnit TEXT DEFAULT 'quintal',
        pricePerUnit REAL NOT NULL,
        deadline DATE NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'completed')),
        description TEXT,
        location TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(agencyId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Grievances Table
    db.run(`
      CREATE TABLE IF NOT EXISTS grievances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmerId INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        resolution TEXT,
        resolvedBy INTEGER,
        resolvedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(farmerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(resolvedBy) REFERENCES users(id)
      )
    `);

    // Create Notifications Table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        read BOOLEAN DEFAULT 0,
        data TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database initialized successfully');
  });
};

const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const getOne = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

module.exports = {
  db,
  initializeDatabase,
  runQuery,
  getOne,
  getAll
};
