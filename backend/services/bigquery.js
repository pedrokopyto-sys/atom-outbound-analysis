const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const { getConfig, setConfig } = require('./db');

let bqClient;

// In-memory cache (avoids even reading the file on repeated calls)
const schemaCache = {};

function getBQClient() {
  if (!bqClient) {
    bqClient = new BigQuery({
      keyFilename: path.join(__dirname, '../credentials/service_account.json'),
      projectId: 'atom-ai-labs-ad1fa'
    });
  }
  return bqClient;
}

function validateSQL(sql) {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT')) {
    throw new Error('Solo se permiten queries SELECT');
  }
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE'];
  for (const keyword of forbidden) {
    if (new RegExp(`\\b${keyword}\\b`).test(trimmed)) {
      throw new Error(`Query contiene keyword no permitida: ${keyword}`);
    }
  }
}

function serializeRows(rows) {
  return rows.map(row => {
    const clean = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === 'object' && v.value !== undefined) clean[k] = v.value;
      else if (typeof v === 'bigint') clean[k] = Number(v);
      else clean[k] = v;
    }
    return clean;
  });
}

async function runQuery(sql) {
  validateSQL(sql);
  const bq = getBQClient();
  const [rows] = await bq.query({ query: sql, useLegacySql: false });
  return serializeRows(rows);
}

// Returns schema as formatted string for Gemini prompts.
// Priority: memory cache → persistent JSON file → BigQuery INFORMATION_SCHEMA
async function getTableSchema(fullTableName) {
  // 1. Memory cache (fastest — zero I/O)
  if (schemaCache[fullTableName]) return schemaCache[fullTableName];

  // 2. Persistent file cache (survives server restarts)
  const cacheKey = `schema:${fullTableName}`;
  const persisted = getConfig(cacheKey);
  if (persisted) {
    schemaCache[fullTableName] = persisted;
    console.log(`✅ Schema loaded from file cache for ${fullTableName}`);
    return persisted;
  }

  // 3. Query BigQuery INFORMATION_SCHEMA (only runs once ever per table)
  const parts = fullTableName.replace(/`/g, '').split('.');
  if (parts.length !== 3) return '';
  const [project, dataset, table] = parts;

  const sql = `
    SELECT column_name, data_type
    FROM \`${project}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${table}'
    ORDER BY ordinal_position
  `;

  try {
    const bq = getBQClient();
    const [rows] = await bq.query({ query: sql, useLegacySql: false });
    const schema = rows.map(r => `- ${r.column_name} (${r.data_type})`).join('\n');
    const formatted = `Columnas reales de la tabla \`${table}\`:\n${schema}`;

    // Save to both caches
    schemaCache[fullTableName] = formatted;
    setConfig(cacheKey, formatted);
    console.log(`✅ Schema fetched from BigQuery and cached for ${table}:\n${formatted}`);
    return formatted;
  } catch (err) {
    console.warn('Could not fetch schema:', err.message);
    return '';
  }
}

// Call this if the table structure changes and cache needs to be refreshed
function clearSchemaCache(fullTableName) {
  const cacheKey = `schema:${fullTableName}`;
  delete schemaCache[fullTableName];
  setConfig(cacheKey, null);
  console.log(`🗑 Schema cache cleared for ${fullTableName}`);
}

module.exports = { runQuery, validateSQL, getTableSchema, clearSchemaCache };
