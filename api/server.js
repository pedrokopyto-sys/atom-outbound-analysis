const { initDB } = require('../backend/services/db');
const app = require('../backend/app');

initDB().catch(console.error);

module.exports = app;
