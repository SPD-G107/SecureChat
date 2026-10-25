import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function runSeeds() {
  logger.info('Starting SecureChat database seeding...');

  try {
    const dbConn = await mysql.createConnection({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
      multipleStatements: true,
    });

    const seedPath = path.resolve(process.cwd(), '../database/seeds/001_seed_data.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }

    const sql = fs.readFileSync(seedPath, 'utf8');
    logger.info(`Applying seeds from ${seedPath}...`);
    await dbConn.query(sql);

    // Verify row counts
    const [users]: any = await dbConn.query('SELECT COUNT(*) as count FROM users');
    const [keys]: any = await dbConn.query('SELECT COUNT(*) as count FROM public_keys');
    const [convs]: any = await dbConn.query('SELECT COUNT(*) as count FROM conversations');
    const [msgs]: any = await dbConn.query('SELECT COUNT(*) as count FROM messages');
    const [logs]: any = await dbConn.query('SELECT COUNT(*) as count FROM audit_logs');

    logger.info(`Database seeded successfully:`);
    logger.info(` - Users: ${users[0].count} (alice, bob, charlie, admin)`);
    logger.info(` - Public Keys: ${keys[0].count}`);
    logger.info(` - Conversations: ${convs[0].count}`);
    logger.info(` - Ciphertext Messages: ${msgs[0].count}`);
    logger.info(` - Audit Logs: ${logs[0].count}`);

    await dbConn.end();
  } catch (err: any) {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeeds();
}
