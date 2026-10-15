import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DATABASE_FILE || path.join(DATA_DIR, 'campus.db');

export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(`[DB] Error opening SQLite database at ${DB_PATH}:`, err.message);
  } else {
    console.log(`[DB] SQLite database connected at ${DB_PATH}`);
  }
});

// Helper promise wrappers for sqlite3
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export async function initSchema() {
  const schema = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS campuses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      code TEXT NOT NULL,
      total_area_m2 REAL DEFAULT 22850
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY,
      campus_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      building_type TEXT NOT NULL,
      location TEXT NOT NULL,
      area_m2 REAL NOT NULL,
      floors INTEGER NOT NULL DEFAULT 1,
      occupancy_capacity INTEGER NOT NULL DEFAULT 500,
      active INTEGER NOT NULL DEFAULT 1,
      sustainability_score REAL DEFAULT 80.0,
      current_kw REAL DEFAULT 0.0,
      total_kwh REAL DEFAULT 0.0,
      current_water_lpm REAL DEFAULT 0.0,
      total_water_liters REAL DEFAULT 0.0,
      occupancy_count INTEGER DEFAULT 0,
      solar_kw REAL DEFAULT 0.0,
      status TEXT DEFAULT 'healthy',
      status_reasons TEXT DEFAULT '[]',
      last_updated_at TEXT,
      FOREIGN KEY(campus_id) REFERENCES campuses(id)
    );

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY,
      building_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      floor INTEGER NOT NULL DEFAULT 0,
      zone_type TEXT NOT NULL,
      area_m2 REAL DEFAULT 500,
      FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      building_id INTEGER NOT NULL,
      zone_id INTEGER,
      sensor_type TEXT NOT NULL,
      unit TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'online',
      source_type TEXT NOT NULL DEFAULT 'simulated',
      min_threshold REAL,
      max_threshold REAL,
      latest_reading REAL DEFAULT 0.0,
      last_updated_at TEXT,
      FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      building_id INTEGER NOT NULL,
      zone_id INTEGER,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      measured_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'simulated',
      quality TEXT NOT NULL DEFAULT 'good',
      FOREIGN KEY(sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_readings_sensor_time ON sensor_readings(sensor_id, measured_at);
    CREATE INDEX IF NOT EXISTS idx_readings_building_metric ON sensor_readings(building_id, metric, measured_at);

    CREATE TABLE IF NOT EXISTS waste_bins (
      id INTEGER PRIMARY KEY,
      building_id INTEGER NOT NULL,
      zone_id INTEGER,
      bin_code TEXT NOT NULL,
      bin_type TEXT NOT NULL,
      capacity_liters REAL NOT NULL DEFAULT 120,
      fill_level_percent REAL NOT NULL DEFAULT 0,
      last_collection_at TEXT,
      status TEXT NOT NULL DEFAULT 'normal',
      FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL,
      sensor_id TEXT,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      ai_recommendation TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      source TEXT NOT NULL DEFAULT 'rule_engine',
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      estimated_waste_rate TEXT,
      FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL,
      scenario_name TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      baseline_value REAL NOT NULL,
      proposed_value REAL NOT NULL,
      difference REAL NOT NULL,
      percent_saved REAL NOT NULL,
      cost_saved_usd REAL NOT NULL,
      co2_avoided_kg REAL NOT NULL,
      unit TEXT NOT NULL,
      assumptions TEXT,
      data_classification TEXT NOT NULL DEFAULT 'ESTIMATE - What-if simulation based on engineering models',
      created_at TEXT NOT NULL,
      FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS simulator_state (
      id INTEGER PRIMARY KEY,
      is_running INTEGER NOT NULL DEFAULT 0,
      interval_seconds INTEGER NOT NULL DEFAULT 10,
      tick_count INTEGER NOT NULL DEFAULT 0,
      last_tick_at TEXT,
      error_message TEXT
    );
  `;

  await exec(schema);
  console.log('[DB] Database schema initialized successfully');
}
