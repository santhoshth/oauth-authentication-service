import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './index';
import { logger } from '../utils/logger';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(config.database.path);
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    logger.info(`Database connected at ${dbPath}`);
  }
  
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

export function initializeDatabase(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('read', 'write', 'delete')),
      resource TEXT NOT NULL,
      effect TEXT NOT NULL CHECK(effect IN ('allow', 'deny')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Composite index for the main query pattern
    CREATE INDEX IF NOT EXISTS idx_user_action_resource 
    ON user_permissions(user_id, action, resource);
    
    -- Additional index for user-based queries
    CREATE INDEX IF NOT EXISTS idx_user_id 
    ON user_permissions(user_id);
  `);

  const existingCount = database.prepare('SELECT COUNT(*) as count FROM user_permissions').get() as { count: number };
  
  if (existingCount.count > 0) {
    database.prepare('DELETE FROM user_permissions').run();
    logger.info(`Cleared ${existingCount.count} existing permissions to refresh data`);
  }

  const samplePermissions = [
    { user_id: 'user123', action: 'read', resource: 'transactions', effect: 'allow' },
    { user_id: 'user123', action: 'write', resource: 'transactions', effect: 'allow' },
    { user_id: 'user123', action: 'delete', resource: 'transactions', effect: 'deny' },
    { user_id: 'user123', action: 'read', resource: 'accounts', effect: 'allow' },
    { user_id: 'user456', action: 'read', resource: 'wallets/*', effect: 'allow' },
    { user_id: 'user456', action: 'write', resource: 'wallets/wallet-789', effect: 'allow' },
    { user_id: 'user456', action: 'read', resource: 'wallets/wallet-789/transactions', effect: 'allow' },
    { user_id: 'user789', action: 'write', resource: 'wallets/*/transactions/*', effect: 'allow' },
    { user_id: 'admin789', action: 'read', resource: '*', effect: 'allow' },
    { user_id: 'admin789', action: 'write', resource: '*', effect: 'allow' },
    { user_id: 'admin789', action: 'delete', resource: '*', effect: 'allow' },
  ];

  const insertStmt = database.prepare(`
    INSERT INTO user_permissions (user_id, action, resource, effect)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = database.transaction((permissions) => {
    for (const permission of permissions) {
      insertStmt.run(permission.user_id, permission.action, permission.resource, permission.effect);
    }
  });

  insertMany(samplePermissions);
  logger.info(`Inserted ${samplePermissions.length} permissions`);

  logger.info('Database schema initialized');
}

export default {
  getDatabase,
  closeDatabase,
  initializeDatabase,
};
