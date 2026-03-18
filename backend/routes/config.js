const express = require('express');
const router = express.Router();
const { getConfig, setConfig } = require('../services/db');
const TABLES = require('../config/tables');

router.get('/load', (req, res) => {
  try {
    res.json({
      tableDoc: getConfig('table_doc') || '',
      basePrompt: getConfig('base_prompt') || 'Sos un analista experto en campañas de WhatsApp. Tu objetivo es ayudar al usuario a entender el rendimiento de sus campañas, identificar oportunidades de mejora y sugerir acciones concretas basadas en datos.',
      tables: TABLES
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/save', (req, res) => {
  try {
    const { tableDoc, basePrompt } = req.body;
    if (tableDoc !== undefined) setConfig('table_doc', tableDoc);
    if (basePrompt !== undefined) setConfig('base_prompt', basePrompt);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
