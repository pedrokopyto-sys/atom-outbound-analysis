const express = require('express');
const router = express.Router();
const { generateSQL, summarizeResults, buildInboundQuery, summarizeInbound } = require('../services/gemini');
const { runQuery, getTableSchema }      = require('../services/bigquery');
const { getConfig, saveHistory }        = require('../services/db');

router.post('/', async (req, res) => {
  try {
    const { question, filters, previousResult = [], tableDoc: bodyTableDoc, basePrompt: bodyBasePrompt } = req.body;

    if (!question || !filters) {
      return res.status(400).json({ error: 'question y filters son requeridos' });
    }

    // Request body takes priority (Vercel); fallback to server-side config (local)
    const tableDoc   = bodyTableDoc   ?? getConfig('table_doc')   ?? '';
    const basePrompt = bodyBasePrompt ?? getConfig('base_prompt') ?? '';

    const isInbound = filters.table && filters.table.includes('first_30_messages_last_30_days');

    let results = [];
    let sql = null;
    let analysis;

    if (isInbound) {
      // Inbound: fixed query, no dynamic SQL generation
      sql = buildInboundQuery({ days: filters.days, company: filters.company, limit: filters.limit });
      results = await runQuery(sql);
      analysis = await summarizeInbound({ question, results, tableDoc, basePrompt });
    } else {
      // Outbound: dynamic SQL via Gemini
      const schema = await getTableSchema(filters.table);
      const aiDecision = await generateSQL({ question, filters, tableDoc, schema, basePrompt, previousResult });

      const action = aiDecision.action;
      if (action === 'query_bigquery') {
        sql = aiDecision.sql;
        results = await runQuery(sql);
      } else if (action === 'compute_from_data') {
        results = aiDecision.computed_result || [];
      } else {
        return res.status(500).json({ error: 'Respuesta inesperada de la IA' });
      }
      analysis = await summarizeResults({ question, results, tableDoc, schema, basePrompt });
    }

    saveHistory({
      question, action, sql_query: sql, raw_results: results,
      respuesta: analysis.respuesta || '',
      followups: analysis.followups || []
    });

    res.json({
      action, sql, results,
      respuesta: analysis.respuesta || '',
      followups: analysis.followups || []
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
