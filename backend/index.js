require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./services/db');
const configRoutes = require('./routes/config');
const bqRoutes = require('./routes/bigquery');
const chatRoutes = require('./routes/chat');
const historyRoutes = require('./routes/history');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/config', configRoutes);
app.use('/api/bq', bqRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/history', historyRoutes);

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
