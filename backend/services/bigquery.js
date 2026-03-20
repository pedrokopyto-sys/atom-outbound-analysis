const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const { getConfig, setConfig } = require('./db');

let bqClient;

const schemaCache = {};

function getBQClient() {
  if (!bqClient) {
    if (process.env.GCP_SERVICE_ACCOUNT) {
      // Vercel: credentials from environment variable
      const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT);
      bqClient = new BigQuery({ credentials, projectId: 'atom-ai-labs-ad1fa' });
    } else {
      // Local: credentials from file
      bqClient = new BigQuery({
        keyFilename: path.join(__dirname, '../credentials/service_account.json'),
        projectId: 'atom-ai-labs-ad1fa'
      });
    }
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

async function getTableSchema(fullTableName) {
  if (schemaCache[fullTableName]) return schemaCache[fullTableName];

  const cacheKey = `schema:${fullTableName}`;
  const persisted = getConfig(cacheKey);
  if (persisted) {
    schemaCache[fullTableName] = persisted;
    return persisted;
  }

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

    schemaCache[fullTableName] = formatted;
    setConfig(cacheKey, formatted);
    return formatted;
  } catch (err) {
    console.warn('Could not fetch schema:', err.message);
    return '';
  }
}

async function getTableDescription(fullTableName) {
  try {
    const parts = fullTableName.replace(/`/g, '').split('.');
    if (parts.length !== 3) return '';
    const [, dataset, table] = parts;
    const bq = getBQClient();
    const [metadata] = await bq.dataset(dataset).table(table).getMetadata();
    return metadata.description || '';
  } catch (err) {
    console.warn('Could not fetch table description:', err.message);
    return '';
  }
}

function clearSchemaCache(fullTableName) {
  const cacheKey = `schema:${fullTableName}`;
  delete schemaCache[fullTableName];
  setConfig(cacheKey, null);
}

module.exports = { runQuery, validateSQL, getTableSchema, clearSchemaCache, getTableDescription };
