// backend/config.mjs
export const config = {
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || '0.0.0.0',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
