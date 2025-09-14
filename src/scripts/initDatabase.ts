import { getDatabase, initializeDatabase } from '../config/database';
import { logger } from '../utils/logger';

function seedDatabase(): void {
  const db = getDatabase();
  
  // Clear existing data
  db.exec('DELETE FROM user_permissions');
  
  // Insert sample data
  const insertStmt = db.prepare(`
    INSERT INTO user_permissions (user_id, action, resource, effect) 
    VALUES (?, ?, ?, ?)
  `);
  
  const sampleData = [
    ['user123', 'read', 'transactions', 'allow'],
    ['user123', 'write', 'transactions', 'allow'],
    ['user123', 'delete', 'transactions', 'deny'],
    ['user123', 'read', 'accounts', 'allow'],
    ['user456', 'read', 'wallets/*', 'allow'],
    ['user456', 'write', 'wallets/wallet-789', 'allow'],
    ['user456', 'read', 'wallets/wallet-789/transactions', 'allow'],
    ['user789', 'write', 'wallets/*/transactions/*', 'allow'],
    ['admin789', 'read', '*', 'allow'],
    ['admin789', 'write', '*', 'allow'],
    ['admin789', 'delete', '*', 'allow'],
  ];
  
  const insertMany = db.transaction((data: any[]) => {
    for (const row of data) {
      insertStmt.run(...row);
    }
  });
  
  insertMany(sampleData);
  
  logger.info(`Inserted ${sampleData.length} sample permissions`);
}

function main(): void {
  try {
    logger.info('Initializing database...');
    initializeDatabase();
    
    logger.info('Seeding database with sample data...');
    seedDatabase();
    
    logger.info('Database initialization complete!');
    
    // Verify data
    const db = getDatabase();
    const count = db.prepare('SELECT COUNT(*) as count FROM user_permissions').get() as { count: number };
    logger.info(`Total permissions in database: ${count.count}`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

main();
