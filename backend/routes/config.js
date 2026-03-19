const express = require('express');
const router = express.Router();
const { getConfig, setConfig } = require('../services/db');
const TABLES = require('../config/tables');

router.get('/load', (req, res) => {
  try {
    const { tableId } = req.query;
    const suffix = tableId ? `_${tableId}` : '';
    res.json({
      tableDoc:   getConfig(`table_doc${suffix}`)   || '',
      basePrompt: getConfig(`base_prompt${suffix}`) || '',
      tables: TABLES
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/save', (req, res) => {
  try {
    const { tableDoc, basePrompt, tableId } = req.body;
    const suffix = tableId ? `_${tableId}` : '';
    if (tableDoc   !== undefined) setConfig(`table_doc${suffix}`,   tableDoc);
    if (basePrompt !== undefined) setConfig(`base_prompt${suffix}`, basePrompt);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
