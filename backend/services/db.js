const fs   = require('fs');
const path = require('path');

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR   = path.join(__dirname, '../data');
const CONFIG_FILE  = path.join(DATA_DIR, 'config.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// In-memory fallback for Vercel (stateless — resets on each cold start)
let memConfig  = {};
let memHistory = [];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

async function initDB() {
  if (IS_VERCEL) {
    console.log('✅ In-memory storage (Vercel mode)');
    return;
  }
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE))  writeJSON(CONFIG_FILE,  {});
  if (!fs.existsSync(HISTORY_FILE)) writeJSON(HISTORY_FILE, []);
  console.log('✅ File-based storage initialized at', DATA_DIR);
}

function getConfig(key) {
  if (IS_VERCEL) return memConfig[key] ?? null;
  return readJSON(CONFIG_FILE, {})[key] ?? null;
}

function setConfig(key, value) {
  if (IS_VERCEL) { memConfig[key] = value; return; }
  ensureDataDir();
  const config = readJSON(CONFIG_FILE, {});
  config[key] = value;
  writeJSON(CONFIG_FILE, config);
}

function getHistory() {
  if (IS_VERCEL) return [...memHistory].slice(-50).reverse();
  return readJSON(HISTORY_FILE, []).slice(-50).reverse();
}

function saveHistory(entry) {
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
  if (IS_VERCEL) {
    memHistory.push(record);
    if (memHistory.length > 200) memHistory.splice(0, memHistory.length - 200);
    return record;
  }
  ensureDataDir();
  const history = readJSON(HISTORY_FILE, []);
  history.push(record);
  if (history.length > 200) history.splice(0, history.length - 200);
  writeJSON(HISTORY_FILE, history);
  return record;
}

function clearHistory() {
  if (IS_VERCEL) { memHistory = []; return; }
  ensureDataDir();
  writeJSON(HISTORY_FILE, []);
}

module.exports = { initDB, getConfig, setConfig, getHistory, saveHistory, clearHistory };
