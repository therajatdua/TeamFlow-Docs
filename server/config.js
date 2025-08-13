module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map(s => s.trim()),
};
