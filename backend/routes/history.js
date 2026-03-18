const express = require('express');
const router = express.Router();
const { getHistory, clearHistory } = require('../services/db');

router.get('/', (req, res) => {
  try {
    const history = getHistory();
    res.json(history.map(h => ({
      ...h,
      raw_results: h.raw_results ? JSON.parse(h.raw_results) : []
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/clear', (req, res) => {
  try {
    clearHistory();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
