// backend/db.mjs
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env located in the backend folder regardless of process.cwd()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

export const sequelize = new Sequelize(
  process.env.DATABASE_NAME,     // was POSTGRES_DB
  process.env.DATABASE_USER,     // was POSTGRES_USER
  process.env.DATABASE_PASSWORD, // was POSTGRES_PASSWORD
  {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : 5432,
    dialect: 'postgres',
    logging: false,
  }
);

// Optionally export a sync helper
export async function syncDb(opts = {}) {
  await sequelize.sync(opts);
}
