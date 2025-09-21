// backend/db.mjs
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT,10) : 5432,
    dialect: 'postgres',
    logging: false,
  }
);

// Optionally export a sync helper
export async function syncDb(opts = {}) {
  await sequelize.sync(opts);
}
