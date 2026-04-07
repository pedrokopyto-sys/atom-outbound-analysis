const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../services/db');

router.get('/download', (req, res) => {
  const { from, to } = req.query;
  const records = getAnalytics(from || null, to || null);

  const headers = ['timestamp', 'question', 'source', 'table', 'company', 'days', 'limit', 'flow_name', 'device'];

  const escape = val => {
    const s = val == null ? '' : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    headers.join(','),
    ...records.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');

  const filename = `consultas_${from || 'inicio'}_${to || 'hoy'}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM para que Excel abra bien el UTF-8
});

module.exports = router;
