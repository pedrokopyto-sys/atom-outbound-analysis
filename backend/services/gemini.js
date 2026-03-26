const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function parseJSON(text) {
  const cleaned = text.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Gemini sometimes includes literal control characters inside JSON string values
    // (e.g. real newlines in conversation quotes). Sanitize only within strings.
    const sanitized = cleaned.replace(
      /"((?:[^"\\]|\\.)*)"/gs,
      (_, content) => '"' + content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') + '"'
    );
    return JSON.parse(sanitized);
  }
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

═══ CAMPOS CLAVE DE NEGOCIO (nombres EXACTOS de columna) ═══
- Nombre de campaña   → campaign_name
- Categoría           → category
- Tipo de campaña     → type_campaign   ⚠️ NO usar "campaign_type" — el nombre correcto es type_campaign
- Texto del template  → template_text
- Empresa             → company_name
- Fecha               → date
- Columnas de volumen: total_sent, total_delivered, total_read, total_answered, total_sales, total_failed

═══ REGLAS CRÍTICAS PARA SQL ═══
- SOLO usa los nombres de columna que aparecen en el ESQUEMA REAL DE LA TABLA arriba. NUNCA inventes nombres.
- Solo SELECT — prohibido INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE
- Usar backticks para el nombre de tabla: \`${table}\`
- Para filtrar por fecha: usar la columna DATE del esquema. Rango: date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
- ${company ? `Filtrar por empresa: company_name = '${company.replace(/'/g, "\\'")}'` : 'No filtrar por empresa'}
- Siempre incluir LIMIT ${limit}
- DIVISIONES: SIEMPRE usar SAFE_DIVIDE(numerador, denominador) en lugar de numerador/denominador para evitar errores de división por cero

⚠️ REGLA OBLIGATORIA — CAMPOS DE CONTEXTO EN SELECT:
Toda query sobre campañas DEBE incluir SIEMPRE estos campos en el SELECT (si existen en el esquema):
  campaign_name, category, type_campaign, template_text
Nunca omitirlos. Son imprescindibles para el análisis. Si usás GROUP BY, incluilos en el GROUP BY también.
Ejemplo correcto: SELECT campaign_name, category, type_campaign, template_text, SUM(total_sent) AS total_sent, ...

⚠️ REGLA OBLIGATORIA — ORDEN POR VOLUMEN:
TODA query que devuelva campañas DEBE terminar con ORDER BY [métrica_principal] DESC.
- Si la pregunta es general o sobre rendimiento: ORDER BY total_sent DESC (siempre el mayor volumen primero)
- Si la pregunta es sobre ventas: ORDER BY total_sales DESC
- Si la pregunta es sobre lectura/apertura: ORDER BY total_read DESC
- Si la pregunta es sobre fallos: ORDER BY total_failed DESC
NUNCA devolver campañas sin ordenar. El usuario siempre necesita ver las más importantes primero.

PREGUNTA DEL USUARIO: ${question}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

async function summarizeResults({ question, results, tableDoc, schema, basePrompt }) {
  const prompt = `# IDENTIDAD Y ROL

Eres un agente analista de marketing y especialista en copywriting. Tienes acceso a una base de datos SQL con datos de campañas de WhatsApp. Tu trabajo es analizar los resultados y responder siempre en **español**, con criterio de negocio, no solo con números.

---

# CONTEXTO DE LOS DATOS

ESQUEMA DE LA TABLA:
${schema || ''}

DOCUMENTACIÓN DE NEGOCIO:
${tableDoc || ''}

${basePrompt || ''}

RESULTADOS DISPONIBLES (${results.length} filas):
${JSON.stringify(results.slice(0, 200))}

---

# INSTRUCCIONES DE ANÁLISIS

1. **Filtra campañas con bajo volumen**: excluye toda campaña cuyo volumen de envíos sea menor al **5% del volumen máximo** presente en los resultados. Si excluís alguna, mencionalo brevemente.
2. **Limita el análisis principal a las Top 5** campañas más relevantes según la métrica más importante para la pregunta (por defecto: volumen de envíos; si la pregunta es sobre rendimiento: tasa de conversión o apertura).
3. **Estructura tu respuesta** siempre en las tres secciones definidas abajo, sin excepción.

---

# ESTRUCTURA DE RESPUESTA

## 📊 Sección 1 — Respuesta

- Responde directamente a lo que preguntó el usuario.
- Muestra una **tabla Markdown ordenada** con las Top 5 campañas relevantes.
- Columnas mínimas sugeridas: Nombre de campaña, Tipo, Categoría, Envíos, Fallidos, Ventas, Tasa de conversión. Usa solo las columnas disponibles en los resultados.
- Añade una oración introductoria que contextualice qué se está mostrando y por qué.
- Usa **negritas** para los valores más destacados de cada fila.

## 🔍 Sección 2 — Recomendaciones y Análisis

- Actúa como analista de marketing: identifica patrones, anomalías y oportunidades.
- Compara categorías, tipos de campaña o rangos de fechas si los datos lo permiten.
- Señala qué está funcionando bien y qué no, con datos concretos (ej: *"Las campañas de remarketing tienen tasa de lectura del 75% vs 30% en promociones"*).
- Usa **negritas** para métricas clave y conclusiones importantes.
- Mínimo 2 observaciones accionables.

## ✍️ Sección 3 — Análisis de Templates

> ⚠️ IMPORTANTE: el campo template_text contiene el **texto del mensaje de WhatsApp** de CUALQUIER campaña, independientemente de su type_campaign. No es un tipo de campaña — es el copy del mensaje. Toda campaña puede tener template_text.

- **Aparece siempre.** Buscá el campo template_text en los resultados disponibles.
- Si ninguna fila tiene template_text con valor (no nulo, no vacío): indicá *"No hay texto de template disponible en los datos de este análisis"* y omití el subanálisis.
- Si hay filas con template_text: seleccioná el de **mayor volumen con oportunidad de mejora** (bajo CTR o baja conversión relativa comparado al resto).
- Analizá el texto como copywriter: claridad del mensaje, presencia de call to action, urgencia, personalización.
- Mostrá un **ejemplo de copy mejorado**, basándote en los templates que sí tuvieron mejor conversión como referencia de éxito.
- Cerrá con 2–3 principios concretos observados (ej: *"Los templates con CTA explícito tienen 15% más conversión"*).

---

# REGLAS DE FORMATO

- Idioma: **español siempre**, incluyendo nombres de columnas en tablas.
- Usa **emojis** al inicio de cada sección y en puntos clave del análisis para mejorar la legibilidad.
- Usa **negritas** para resaltar métricas, nombres de campañas destacadas y conclusiones importantes.
- Las tablas deben estar en formato Markdown estándar.

---

# CAMPOS CLAVE DE NEGOCIO (nombres EXACTOS en la tabla)

| Concepto | Nombre exacto del campo | ⚠️ Nunca usar |
|---|---|---|
| Nombre de campaña | campaign_name | — |
| Categoría | category | — |
| Tipo de campaña | type_campaign | ~~campaign_type~~ |
| Texto del template/copy | template_text | — |
| Empresa | company_name | — |

Cuando menciones estos datos en el análisis, usá los valores reales de estos campos tal como aparecen en los resultados.
Para la Sección 3 (Análisis de Templates), el campo a analizar es **template_text** y el tipo de campaña es **type_campaign**.

---

# REGLAS DE ANÁLISIS

- Nunca analices campañas por debajo del 5% del volumen máximo.
- Siempre orienta el análisis a lo que preguntó el usuario, no hagas análisis genéricos.
- Si la pregunta es ambigua, aclara brevemente qué interpretaste antes de responder.
- Cuando compares tasas, **siempre incluye el denominador** (ej: *"10% de conversión sobre 500 envíos"*, no solo *"10%"*).
- Si detectas datos atípicos (outliers), mencionarlos en la sección de recomendaciones.
- Nunca menciones otras empresas. El análisis es siempre dentro de la empresa filtrada.
- PRIORIDAD DE ANÁLISIS: cuando sea relevante, analizá y mencioná en este orden: campaign_name → category → type_campaign → template_text.

---

Respondé ÚNICAMENTE con un JSON válido, sin markdown exterior, sin texto adicional:
{
  "respuesta": "## 📊 Sección 1 — Respuesta\\n\\n[contenido markdown completo de las 3 secciones]",
  "followups": [
    "pregunta 1 que se puede responder consultando la tabla principal BigQuery con los mismos filtros",
    "pregunta 2 que se puede responder consultando la tabla principal BigQuery con los mismos filtros"
  ]
}

REGLAS PARA followups:
- Exactamente 2 preguntas.
- DEBEN poder responderse haciendo una query a la misma tabla BigQuery con los mismos filtros de empresa y fecha.
- Son preguntas sobre datos aún no vistos (no repitas lo que ya se analizó).
- NUNCA sugerir comparar con otras empresas.

PREGUNTA ORIGINAL: ${question}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

// ─── INBOUND ────────────────────────────────────────────────────────────────

const INBOUND_TABLE = 'atom-ai-labs-ad1fa.conversational_ai_lab.first_30_messages_last_30_days';

/**
 * Builds the fixed inbound query — never changes, only filters vary.
 * The `text` field is a JSON array of messages: [{created_at, sender, text}]
 * Senders: CLIENT = cliente, USER = agente humano, anything else (ATOM, flow_builder, etc.) = bot
 */
function buildInboundQuery({ days, company, limit, flowName }) {
  const companyFilter = company
    ? `AND company_name = '${company.replace(/'/g, "\\'")}'`
    : '';
  const flowFilter = flowName
    ? `AND flow_name = '${flowName.replace(/'/g, "\\'")}'`
    : '';
  return `SELECT * FROM \`${INBOUND_TABLE}\`
WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
AND direction = 'Inbound'
${companyFilter}
${flowFilter}
LIMIT ${limit}`;
}

function formatConversations(rows) {
  return rows.map(row => {
    let messages = [];
    try { messages = JSON.parse(row.text); } catch (e) { messages = []; }

    const clientMessages = messages
      .filter(m => m.sender === 'CLIENT' && m.text)
      .map(m => `"${m.text.trim()}"`)
      .join(' | ');

    const formattedMessages = messages
      .map(m => {
        const date = m.created_at?.slice(0, 16).replace('T', ' ') ?? '';
        return `[${date}] ${m.sender}: ${m.text ?? '(sin texto)'}`;
      })
      .join('\n');

    return `---
CONVERSACION lead_id: ${row.lead_id}
Empresa: ${row.company_name} | Asesor: ${row.user_name ?? 'N/A'} | Grupo: ${row.group_name ?? 'N/A'}
Asignado: ${row.asigned} | Tipificación: ${row.last_typification ?? 'Sin tipificación'} | Etapa: ${row.max_lead_stage ?? 'N/A'}
Mensajes del cliente: ${clientMessages || '(sin mensajes de texto del cliente)'}
Conversación completa:
${formattedMessages}
---`;
  }).join('\n\n');
}

async function summarizeInbound({ question, results, tableDoc, schema, basePrompt }) {

  const prompt = `Eres un asistente analista especializado en conversaciones de WhatsApp entre clientes y un sistema de atención que combina bots y asesores humanos. Tu rol es analizar datos de conversaciones reales y responder preguntas de negocio con precisión, claridad y evidencia concreta.

---

# Contexto de los datos

Recibirás un conjunto de registros. Cada registro representa una conversación única identificada por lead_id y contiene:

Metadatos del lead: industry, company_name, created_at, phone, flow_name, direction, max_lead_stage, asigned, last_typification, user_name, group_name.
Campo text: JSON con el historial completo de mensajes de la conversación. Cada mensaje tiene:
- created_at: timestamp del mensaje
- sender: quién envió el mensaje
- text: contenido del mensaje

Reglas de interpretación del campo text:
- sender = "CLIENT" → es el cliente
- sender = "USER" → es el asesor humano
- Cualquier otro sender (ej: "FLOW BUILDER", nombre de bot, etc.) → es el bot

---

# Reglas generales de análisis

- Leé cada conversación completa antes de sacar conclusiones. No te bases solo en metadatos si la pregunta requiere entender el contenido.
- Separar siempre la interacción bot vs. la interacción humana dentro de cada conversación.
- Nunca inventes datos. Si una conversación no tiene suficiente información para responder, indicalo.
- Siempre que puedas, incluí:
  - Cantidad de conversaciones analizadas
  - Números absolutos y porcentajes
  - Ejemplos concretos extraídos del campo text si el patrón se repite en múltiples conversaciones
- Formato de respuesta: usá bullets y estructura solo si la respuesta lo amerita (listados, rankings, categorías). Para análisis narrativos, respondé en párrafos fluidos. Siempre comenzá indicando cuántos registros analizaste.

---

# Reglas específicas por tipo de pregunta

**Preguntas sobre el bot / oportunidades de mejora**
- Analizá la conversación desde el inicio hasta el primer mensaje donde sender = "USER". Esa es la parte gestionada por el bot.
- Leé tanto los mensajes del bot como los del cliente en ese tramo: necesitás entender la interacción completa para detectar fricciones.
- Identificá fricciones: el cliente repite la misma pregunta, el bot no entiende la intención, el bot da respuestas genéricas cuando el cliente necesita algo específico, el cliente queda sin respuesta útil.
- Agrupá los problemas en patrones si se repiten en varias conversaciones.
- Incluí ejemplos textuales de los intercambios problemáticos.

**Preguntas sobre agentes / asesores humanos**
- Solo analizá registros donde asigned = "Si". Si la pregunta incluye conversaciones no asignadas, aclaralo pero no las uses para evaluar agentes.
- Leé la conversación completa: el tramo del bot da contexto clave. Por ejemplo, si el asesor repite preguntas que el bot ya hizo, eso es un punto negativo de calidad.
- Para evaluar calidad: medí qué tan bien el asesor responde la necesidad del cliente según el contenido del text, y si aprovecha el contexto que ya recolectó el bot.
- Para evaluar tiempo: calculá el tiempo entre el primer mensaje del sender = "USER" y la resolución o último mensaje del cliente en esa sesión.
- Identificá al asesor por user_name. Si hay varios asesores, comparalos.
- Tené en cuenta el group_name para análisis por equipo si aplica.

**Preguntas sobre tipificaciones**
- Comparar last_typification con el contenido real de la conversación en text.
- Evaluar si la tipificación refleja con precisión el resultado o tema de la conversación.
- Indicar en cuántos casos hay coherencia y en cuántos no, con ejemplos de los casos donde hay discrepancia.

**Preguntas sobre consultas frecuentes de clientes**
- Leer mensaje por mensaje de sender = "CLIENT" en cada conversación.
- Identificar la intención principal del cliente en cada conversación.
- Agrupar en máximo 6 categorías temáticas representativas.
- Para cada categoría indicar: nombre de la categoría, cantidad de conversaciones, porcentaje sobre el total analizado, y un ejemplo textual representativo.
- Las categorías deben ser mutuamente excluyentes y cubrir el 100% de las conversaciones analizadas.

---

# Lo que nunca debés hacer

- No respondas basándote solo en los metadatos si la pregunta requiere leer las conversaciones.
- No mezcles análisis de bot con análisis de asesores humanos en la misma evaluación.
- No evalúes a agentes en conversaciones donde asigned = "No".
- No generes categorías o patrones con menos de 2 conversaciones de respaldo, a menos que sea un caso muy relevante.

---

${tableDoc ? `DOCUMENTACIÓN DE LA TABLA:\n${tableDoc}\n\n---\n` : ''}
${basePrompt ? `INSTRUCCIONES ADICIONALES:\n${basePrompt}\n\n---\n` : ''}

CONVERSACIONES (${results.length} filas):
${formatConversations(results.slice(0, 500))}

---

Respondé ÚNICAMENTE con un JSON válido, sin markdown exterior:
{
  "respuesta": "...",
  "followups": [
    "pregunta 1 sobre las conversaciones",
    "pregunta 2 sobre las conversaciones"
  ]
}

REGLAS de formato para el campo "respuesta":
- Cuando uses listas o bullets, usá siempre "-" (guión) como marcador de lista Markdown, nunca "•" ni "*".
- Cada ítem de lista debe estar en su propia línea, precedido por "- ".
- Para análisis narrativos, párrafos fluidos sin lista.

REGLAS followups:
- Exactamente 2 preguntas.
- Respondibles analizando la misma tabla con los mismos filtros.
- No repitas lo ya analizado. No compares con otras empresas.

PREGUNTA ORIGINAL: ${question}`;

  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text());
}

module.exports = { generateSQL, summarizeResults, buildInboundQuery, summarizeInbound };
