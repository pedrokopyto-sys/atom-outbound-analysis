const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function parseJSON(text) {
  const cleaned = text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

async function generateSQL({ question, filters, tableDoc, schema, basePrompt, previousResult }) {
  const { table, days, company, limit } = filters;
  const hasPrevResult = previousResult && previousResult.length > 0;
  const prevResultStr = hasPrevResult
    ? JSON.stringify(previousResult.slice(0, 150))
    : 'No hay resultados previos';

  const prompt = `Eres un experto en BigQuery y analista de datos para campañas de WhatsApp.

═══ ESQUEMA REAL DE LA TABLA (usa EXACTAMENTE estos nombres de columna) ═══
${schema || 'Esquema no disponible — inferí los campos del contexto.'}

═══ DOCUMENTACIÓN DE NEGOCIO (opcional) ═══
${tableDoc || 'Sin documentación adicional.'}

═══ COMPORTAMIENTO ═══
${basePrompt || 'Ayudá al usuario a entender el rendimiento de sus campañas de WhatsApp.'}

═══ FILTROS ACTIVOS ═══
- Tabla: \`${table}\`
- Rango de fechas: últimos ${days} días
- Empresa: ${company || 'ninguna (no filtrar por empresa)'}
- Límite de registros: ${limit}

═══ RESULTADOS DE LA QUERY ANTERIOR (máx 150 filas) ═══
${prevResultStr}

═══ INSTRUCCIONES ═══
Respondé ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional.

Si la pregunta requiere consultar BigQuery para obtener datos nuevos o diferentes:
{"action":"query_bigquery","sql":"SELECT ..."}

Si la pregunta se puede responder computando sobre los RESULTADOS ANTERIORES (ej: sumar, reagrupar, filtrar los ya obtenidos):
{"action":"compute_from_data","computed_result":[...array de objetos...],"computation_description":"descripción breve"}

═══ REGLAS CRÍTICAS PARA SQL ═══
- SOLO usa los nombres de columna que aparecen en el ESQUEMA REAL DE LA TABLA arriba. NUNCA inventes nombres.
- Solo SELECT — prohibido INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE
- Usar backticks para el nombre de tabla: \`${table}\`
- Para filtrar por fecha: usar la columna DATE del esquema. Rango: date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
- ${company ? `Filtrar por empresa: company_name = '${company.replace(/'/g, "\\'")}'` : 'No filtrar por empresa'}
- Siempre incluir LIMIT ${limit}
- ORDENAMIENTO: si la query incluye columnas de volumen o cantidad (total_sent, total_delivered, total_read, total_answered, total_sales, total_failed, total_asignados, COUNT(*), SUM(...) o cualquier alias numérico), siempre agregar ORDER BY esa columna DESC
- DIVISIONES: SIEMPRE usar SAFE_DIVIDE(numerador, denominador) en lugar de numerador/denominador para evitar errores de división por cero

PREGUNTA DEL USUARIO: ${question}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

async function summarizeResults({ question, results, tableDoc, schema, basePrompt }) {
  const prompt = `Sos un analista de datos senior especializado en campañas de marketing por WhatsApp.

ESQUEMA DE LA TABLA:
${schema || ''}

DOCUMENTACIÓN:
${tableDoc || ''}

${basePrompt || ''}

Analizá los resultados de la consulta y respondé ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional:
{
  "analisis": [
    "hallazgo concreto 1 basado en los datos",
    "hallazgo concreto 2 basado en los datos"
  ],
  "recomendaciones": [
    "acción concreta y accionable 1",
    "acción concreta y accionable 2"
  ],
  "followups": [
    "pregunta de profundización 1",
    "pregunta de profundización 2"
  ]
}

REGLAS ESTRICTAS:
- analisis: exactamente 3 items, no más. Cada uno expresa un hallazgo o patrón concreto encontrado en los datos. Sin párrafos, sin títulos.
- recomendaciones: exactamente 3 items, no más. Cada uno es una acción concreta derivada del análisis. Sin párrafos.
- followups: exactamente 2 preguntas, no más que un analista haría para profundizar. Deben ser ESPECÍFICAS al contexto de los datos encontrados (campañas, templates, fechas concretas). NUNCA sugerir comparar con otras empresas ni ver el total general — el análisis siempre es dentro de la empresa ya filtrada.
- recomendaciones: ídem, nunca mencionar otras empresas. Siempre acciones dentro de la empresa analizada.
- Respondé SIEMPRE en el idioma de la pregunta del usuario.

PREGUNTA ORIGINAL: ${question}

RESULTADOS (${results.length} filas):
${JSON.stringify(results.slice(0, 200))}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

module.exports = { generateSQL, summarizeResults };
