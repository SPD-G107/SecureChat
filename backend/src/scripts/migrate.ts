import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function runMigrations() {
  logger.info('Starting SecureChat database migration...');

  // 1. Initial connection (without database selected to allow CREATE DATABASE)
  const rootConn = await mysql.createConnection({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    logger.info(`Ensuring database '${ENV.DB_NAME}' exists...`);
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${ENV.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();

    // 2. Connect to the specific database
    const dbConn = await mysql.createConnection({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USER,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_NAME,
      multipleStatements: true,
    });

    const schemaPath = path.resolve(process.cwd(), '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const sql = fs.readFileSync(schemaPath, 'utf8');
    logger.info(`Applying schema from ${schemaPath}...`);
    await dbConn.query(sql);

    logger.info('Verifying created tables:');
    const [rows]: any = await dbConn.query('SHOW TABLES;');
    const tableKey = `Tables_in_${ENV.DB_NAME}`;
    for (const row of rows) {
      logger.info(` - Table created: ${row[tableKey] || Object.values(row)[0]}`);
    }

    await dbConn.end();
    logger.info('Migration completed successfully.');
  } catch (err: any) {
    logger.error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations();
}
