import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const generatedRuntimeJwtSecret = crypto.randomBytes(32).toString('hex');

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'securechat',
  JWT_SECRET: process.env.JWT_SECRET?.trim() || generatedRuntimeJwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME?.trim() || 'adminSecureChat',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD?.trim() || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BKUyk0P1y9rKQfLw5FUfnoO-4mHZaYKzEuAvyZh3gz1LMPm7Pdgl0xNYYhyqNfZilfaFHmW_OiOGpm2cvvCTiFw',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'aJ9kiTaESbv3V5msZsEjNm1qOJbXWZop_1ik-OE3_cQ',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@securechat.io',
};
