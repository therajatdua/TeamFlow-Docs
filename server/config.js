module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://*.vercel.app',
  ].join(','))
    .split(',')
    .map(s => s.trim()),
};
