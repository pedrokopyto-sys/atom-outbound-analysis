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
  const prompt = `Sos un consultor de datos senior especializado en campañas de marketing por WhatsApp.

ESQUEMA DE LA TABLA:
${schema || ''}

DOCUMENTACIÓN:
${tableDoc || ''}

${basePrompt || ''}

Analizá los resultados y respondé ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional:
{
  "respuesta": "respuesta directa a la pregunta del usuario, en texto corrido, máximo 3 oraciones, con datos concretos de los resultados y tono de consultor",
  "followups": [
    "pregunta 1 que se puede responder consultando la tabla principal con otro filtro o agrupación",
    "pregunta 2 que se puede responder consultando la tabla principal con otro filtro o agrupación"
  ]
}

REGLAS ESTRICTAS:
- respuesta: texto corrido, máximo 3 oraciones. Debe contestar directamente la pregunta del usuario usando los datos reales de los resultados. Tono analítico de consultor: directo, con números concretos, sin rodeos. Sin listas, sin bullets, sin títulos.
- followups: exactamente 2 preguntas. DEBEN ser preguntas que se puedan responder haciendo una query a la misma tabla BigQuery con los mismos filtros de empresa y fecha. Son preguntas sobre datos que aún no se vieron (no repitas lo que ya se analizó). NUNCA sugerir comparar con otras empresas.
- PRIORIDAD DE ANÁLISIS: siempre analizá y mencioná en este orden cuando sea relevante: campaign_name → category → campaign_type → template_text. El rendimiento siempre se interpreta en el contexto de estas dimensiones.
- RELEVANCIA POR VOLUMEN: ignorá campañas con volumen insignificante comparado al resto (ej: si hay campañas de 10.000 envíos y una de 3, ignorá la de 3). Si excluís alguna, mencionalo brevemente.
- Nunca menciones otras empresas. El análisis es siempre dentro de la empresa ya filtrada.
- Respondé SIEMPRE en el idioma de la pregunta del usuario.

PREGUNTA ORIGINAL: ${question}

RESULTADOS (${results.length} filas):
${JSON.stringify(results.slice(0, 200))}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

module.exports = { generateSQL, summarizeResults };
