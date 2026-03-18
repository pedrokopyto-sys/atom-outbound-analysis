const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

async function initDB() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) writeJSON(CONFIG_FILE, {});
  if (!fs.existsSync(HISTORY_FILE)) writeJSON(HISTORY_FILE, []);
  console.log('✅ File-based storage initialized at', DATA_DIR);
}

function getConfig(key) {
  const config = readJSON(CONFIG_FILE, {});
  return config[key] ?? null;
}

function setConfig(key, value) {
  ensureDataDir();
  const config = readJSON(CONFIG_FILE, {});
  config[key] = value;
  writeJSON(CONFIG_FILE, config);
}

function getHistory() {
  const history = readJSON(HISTORY_FILE, []);
  return history.slice(-50).reverse();
}

function saveHistory(entry) {
  ensureDataDir();
  const history = readJSON(HISTORY_FILE, []);
  const record = {
    id: Date.now(),
    question:        entry.question,
    action:          entry.action          ?? null,
    sql_query:       entry.sql_query       ?? null,
    raw_results:     entry.raw_results     ?? null,
    analisis:        entry.analisis        ?? [],
    recomendaciones: entry.recomendaciones ?? [],
    followups:       entry.followups       ?? [],
    created_at: new Date().toISOString()
  };
  history.push(record);
  if (history.length > 200) history.splice(0, history.length - 200);
  writeJSON(HISTORY_FILE, history);
  return record;
}

function clearHistory() {
  ensureDataDir();
  writeJSON(HISTORY_FILE, []);
}

module.exports = { initDB, getConfig, setConfig, getHistory, saveHistory, clearHistory };
