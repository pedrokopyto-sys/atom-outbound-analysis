const express = require('express');
const router = express.Router();
const { runQuery, validateSQL, clearSchemaCache } = require('../services/bigquery');
const TABLES = require('../config/tables');

router.post('/test', async (req, res) => {
  try {
    const { tableId, days = 7, company, limit = 100 } = req.body;
    const table = TABLES.find(t => t.id === tableId) || TABLES[0];

    let sql = `SELECT *\nFROM \`${table.fullName}\`\nWHERE DATE(${table.dateColumn}) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${parseInt(days)} DAY)`;
    if (company && company.trim()) {
      sql += `\n  AND ${table.companyColumn} = '${company.replace(/'/g, "\\'")}'`;
    }
    sql += `\nLIMIT ${parseInt(limit)}`;

    const rows = await runQuery(sql);
    res.json({ sql, rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/query', async (req, res) => {
  try {
    const { sql } = req.body;
    validateSQL(sql);
    const rows = await runQuery(sql);
    res.json({ rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/schema-cache', (req, res) => {
  try {
    const { tableId } = req.query;
    const table = TABLES.find(t => t.id === tableId) || TABLES[0];
    clearSchemaCache(table.fullName);
    res.json({ success: true, message: `Cache limpiado para ${table.label}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/companies', async (req, res) => {
  try {
    const { tableId, days = 30 } = req.query;
    const table = TABLES.find(t => t.id === tableId) || TABLES[0];
    const sql = `
      SELECT DISTINCT ${table.companyColumn} as company_name
      FROM \`${table.fullName}\`
      WHERE DATE(${table.dateColumn}) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${parseInt(days)} DAY)
        AND ${table.companyColumn} IS NOT NULL
        AND TRIM(${table.companyColumn}) != ''
      ORDER BY company_name
      LIMIT 500
    `;
    const rows = await runQuery(sql);
    res.json(rows.map(r => r.company_name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
