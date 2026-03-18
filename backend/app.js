require('dotenv').config();
const express = require('express');
const cors = require('cors');
const configRoutes  = require('./routes/config');
const bqRoutes      = require('./routes/bigquery');
const chatRoutes    = require('./routes/chat');
const historyRoutes = require('./routes/history');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/config',  configRoutes);
app.use('/api/bq',      bqRoutes);
app.use('/api/chat',    chatRoutes);
app.use('/api/history', historyRoutes);

module.exports = app;
