# Changelog

---

## Sesión 6 — 2026-03-19 (continuación 2) — Fixes SQL

### Fixes en generación de queries (`backend/services/gemini.js`)
- **Campos de contexto obligatorios en SELECT**: toda query sobre campañas DEBE incluir `campaign_name`, `category`, `type_campaign`, `template_text`. Antes Gemini los omitía (ej: agrupaba solo por `campaign_name`) dejando esas columnas vacías en la respuesta.
- **ORDER BY volumen reforzado como regla inamovible**: toda query que devuelva campañas DEBE ordenar por la métrica principal DESC — `total_sent` por defecto, o la métrica relevante según la pregunta (ventas, lectura, fallos). Antes era una sugerencia que Gemini podía ignorar.

---

## Sesión 6 — 2026-03-19 (continuación) — Code review y fixes

### Fixes detectados en code review
- `backend/services/db.js`: `saveHistory()` ahora guarda el campo `respuesta` correctamente (antes guardaba `analisis`/`recomendaciones` obsoletos — historial siempre cargaba vacío)
- `frontend/src/api.js`: `loadConfig()` acepta `tableId` como query param opcional
- `frontend/src/pages/Settings.jsx` + `Home.jsx`: pasan `tableId` en `loadConfig()` para obtener config por tabla desde el backend

---

## Sesión 6 — 2026-03-19

### Soporte multi-tabla: Análisis Outbound + Análisis Conversaciones Inbound

#### Backend
- `backend/config/tables.js`: agregada segunda tabla `first_30_messages_last_30_days` con label "Análisis Conversaciones Inbound"
  - ⚠️ **Pendiente**: configurar `dateColumn`, `companyColumn`, `tableDoc` y `basePrompt` correctos para esta tabla en sesión futura (los campos son distintos a `outbound_analysis`)
- `backend/routes/config.js`: load y save de config ahora son por tabla (`table_doc_${tableId}`, `base_prompt_${tableId}`)

#### Frontend
- `Settings.jsx`: selector "Tipo de análisis" (full width, arriba de los filtros) que muestra ambas tablas
  - Al cambiar tabla: carga la config específica de esa tabla desde localStorage
  - Guardar filtros también guarda `atom_table_id` en localStorage
  - Guardar prompt/doc guarda con key por tabla (`atom_table_doc_${tableId}`, `atom_base_prompt_${tableId}`)
- `Home.jsx`: lee `atom_table_id` de localStorage al iniciar
  - Barra de filtros activos muestra el nombre del análisis activo + empresa + días + límite
  - `getClientConfig()` lee `tableDoc`/`basePrompt` por tabla activa
  - DEFAULT_CONFIG incluye ambas tablas

---

## Sesión 5 — 2026-03-19

### Nuevo sistema de análisis: identidad de consultor + respuesta Markdown estructurada

#### Backend (`backend/services/gemini.js`)
- `summarizeResults()` reescrito completamente con nueva identidad y flujo de análisis
- Gemini actúa como **analista de marketing + especialista en copywriting**
- Filtro de volumen automático: excluye campañas con envíos < 5% del máximo del conjunto
- Limita análisis a **Top 5** campañas más relevantes según la métrica de la pregunta
- Respuesta siempre estructurada en **3 secciones fijas** devueltas como Markdown dentro del JSON:
  1. **📊 Sección 1 — Respuesta**: tabla Markdown Top 5 + oración intro + negritas en valores clave
  2. **🔍 Sección 2 — Recomendaciones y Análisis**: patrones, anomalías, mín. 2 observaciones accionables con datos concretos
  3. **✍️ Sección 3 — Análisis de Templates**: siempre presente; analiza copy del template con mayor oportunidad de mejora y propone versión mejorada; si no hay templates lo indica explícitamente
- Follow-ups: 2 preguntas consultables contra la misma tabla BigQuery, nunca comparar empresas
- Español siempre, emojis en puntos clave, denominador siempre incluido en tasas

#### Frontend (`frontend/src/components/ResponseCard.jsx`, `frontend/tailwind.config.js`)
- Respuesta renderizada como **Markdown completo** usando `react-markdown` + `remark-gfm`
- Soporte nativo para tablas Markdown, negritas, cursivas y emojis
- Estilos tipográficos con `@tailwindcss/typography` (clases `prose`)

#### Dependencias nuevas
- `react-markdown` — renderizado de Markdown en React
- `remark-gfm` — soporte para tablas y GFM en react-markdown
- `@tailwindcss/typography` — plugin Tailwind para estilizar contenido Markdown

---

## Sesión 4 — 2026-03-17

### Nuevo formato de respuesta y rediseño de ResponseCard

#### Backend (`backend/services/gemini.js`, `backend/routes/chat.js`)
- `summarizeResults()` reemplazado completamente: ya no devuelve `{ analisis[], recomendaciones[], followups[] }` sino `{ respuesta, followups[] }`
- `respuesta`: texto corrido, máx. 3 oraciones, tono de consultor, contesta directamente la pregunta con datos reales
- `followups`: 2 preguntas que DEBEN poder responderse con una query a la misma tabla BigQuery (no preguntas genéricas)
- Prioridad de análisis inyectada en el prompt: `campaign_name → category → campaign_type → template_text`
- Filtro de volumen: Gemini ignora campañas con envíos insignificantes vs. el resto y puede mencionarlo en la respuesta
- `chat.js`: guarda y devuelve `respuesta` en lugar de `analisis`/`recomendaciones`

#### Frontend (`frontend/src/components/ResponseCard.jsx`, `frontend/src/pages/Home.jsx`)
- `ResponseCard`: layout simplificado — un solo bloque de texto para la respuesta (sin columnas, sin listas)
- Tabla de datos oculta por defecto — botón grande con borde punteado naranja "Ver tabla de datos (N registros)" la despliega
- Botón "Ocultar" para volver a colapsar la tabla
- Follow-ups: botones alineados a la izquierda (antes centrados), con chevron a la izquierda
- `Home.jsx`: `handleHistoryItem` actualizado para usar campo `respuesta` al cargar historial

---

## Sesión 3 — 2026-03-17

### Git, deploy y mejoras de tablas

#### Git & Deploy
- Repositorio Git inicializado en el proyecto
- Repo privado creado en GitHub: `pedrokopyto-sys/atom-outbound-analysis`
- `.gitignore` configurado: excluye `node_modules/`, `backend/.env`, `backend/credentials/`, `backend/data/`, `frontend/dist/`
- Primer commit y push a GitHub
- **Deploy en Vercel** (frontend + serverless functions):
  - `api/server.js` como entry point que exporta el Express app
  - `vercel.json` con buildCommand + rewrites `/api/:path*` → `/api/server`
  - `package.json` raíz con dependencias del backend para Vercel Functions
  - `backend/services/bigquery.js`: soporte para `GCP_SERVICE_ACCOUNT` env var
  - `backend/services/db.js`: modo in-memory cuando `VERCEL=1` (sin filesystem)
  - `backend/routes/chat.js`: `tableDoc`/`basePrompt` pueden venir del request body
  - `frontend/src/pages/Settings.jsx`: guarda config en `localStorage` además del servidor
  - `frontend/src/pages/Home.jsx`: envía config desde `localStorage` con cada chat request; default config con tabla hardcodeada para funcionar sin servidor
- **Pendiente**: historial de conversaciones no persiste en Vercel (filesystem efímero). Se migrará a Vercel KV o Firestore en sesión futura.

#### DataTable — Columnas de Rate
- Detección de columnas rate/porcentaje por nombre (`rate`, `tasa`, `ratio`, `pct`, `percent`, `porcentaje`, `conversion`) y por valor (todos los valores entre 0 y 1)
- Columnas de cantidad (`total_read`, `total_sent`, etc.) ya NO se detectan como rate
- Formato automático `XX.XX%` en columnas rate
- Escala de colores heatmap rojo→verde por min/max en columnas rate
- Escala invertida para columnas negativas (`error`, `fail`, `baja`, etc.)
- Fix: detección `numericCols` cambiada de `every` a "≥80% numérico" para tolerar nulls
- Fix: value-based rate detection requiere ≥3 valores y al menos uno entre 0 y 1 (evita falsos positivos)

#### Filtros — movidos a Configuración
- `FilterBar` eliminado de la pantalla principal (`Home.jsx`)
- `Settings.jsx`: selectores empresa/días/límite guardan en `localStorage` como filtros por defecto
- `Home.jsx`: lee filtros desde `localStorage` al iniciar; barra informativa muestra empresa activa con link "Cambiar"
- Warning visible si no hay empresa configurada

---

Historial de cambios y decisiones por sesión de desarrollo.

---

## Sesión 2 — 2026-03-17

### Nuevo formato de respuesta, rediseño visual completo y auditoría UX/UI

---

#### Backend

**Nuevo formato de respuesta AI (`backend/services/gemini.js`)**
- `summarizeResults()` ahora devuelve `{ analisis, recomendaciones, followups }` en lugar de `{ summary, insight, chart_type }`
- `analisis`: exactamente 3 hallazgos concretos basados en datos
- `recomendaciones`: exactamente 3 acciones concretas derivadas del análisis
- `followups`: exactamente 2 preguntas de profundización específicas al contexto
- Regla explícita: nunca sugerir comparar con otras empresas (el análisis siempre es por empresa filtrada)
- Modelo actualizado a `gemini-2.0-flash`
- Reglas SQL: `SAFE_DIVIDE()` para evitar división por cero, auto-`ORDER BY` en columnas de volumen DESC

**Rutas actualizadas (`backend/routes/chat.js`)**
- Respuesta del endpoint `POST /api/chat` incluye los nuevos campos: `analisis`, `recomendaciones`, `followups`

**Persistencia actualizada (`backend/services/db.js`)**
- `saveHistory()` guarda los nuevos campos `analisis`, `recomendaciones`, `followups`
- Reemplazó `summary`, `insight`, `chart_type` del modelo anterior

**Schema auto-detección (`backend/services/bigquery.js`)**
- Consulta `INFORMATION_SCHEMA.COLUMNS` para obtener el esquema real de la tabla
- Cache de 3 niveles: memoria → archivo (`config.json`) → BigQuery
- Endpoint `DELETE /api/bq/schema-cache` para forzar refresco

**Persistencia migrada de SQLite a JSON**
- `better-sqlite3` requería compilación nativa no disponible en el entorno
- Reemplazado por `config.json` + `history.json` en `backend/data/`

---

#### Frontend

**Nuevo componente `ResponseCard`**
- Layout de 2 columnas: Análisis (izquierda, fondo crema) | Recomendaciones (derecha, fondo blanco)
- Tabla resumen full-width debajo
- Botones follow-up centrados con `max-w-xl`, hover naranja sólido
- Barra de acciones: Ver Query (naranja), Exportar CSV, Regenerar, Copiar análisis (ghost buttons)

**`Home.jsx`**
- `onFollowUp={handleSend}` conectado a `ResponseCard` — los botones de profundización envían la pregunta directamente
- `handleHistoryItem` actualizado para mapear nuevos campos del historial
- `handleSend` bloquea envío si no hay empresa seleccionada (`!filters.company`)
- Dark mode eliminado, layout full-width

**`FilterBar.jsx`**
- Empresa es filtro **obligatorio** — se auto-selecciona la primera al cargar
- Eliminada la opción "Todas las empresas"
- Labels por encima de cada select (`text-accent font-bold uppercase`)
- `border` (1px) en lugar de `border-2`, hover más definido

**`SuggestedActions.jsx`**
- Eliminada sugerencia "Empresas con más envíos" (contexto es por empresa)
- Textos acortados: "Mejor rendimiento", "Mayor tasa de error", "Templates top", "Envíos por día"
- Emojis reemplazados por íconos Lucide (`BarChart2`, `TrendingDown`, `Trophy`, `CalendarDays`)
- Estilo: `bg-gray-900 hover:bg-accent` con micro-animación

**`DataTable.jsx`**
- Detección automática de columnas numéricas → `font-bold text-accent`
- Header de tabla en `bg-orange-50` con columnas en naranja bold
- Hover de filas en `orange-50/40`

**`Settings.jsx`**
- Textareas reemplazadas por tarjetas con botón **Editar** (naranja)
- Modal popup para editar documentación y prompt base
- Íconos Lucide para "Configuración" (`Settings2`) y "Probar conexión" (`Plug`)
- `shadow-2xl` → `shadow-xl` para consistencia de modales

**Tipografía**
- Fuente cambiada de `Inter` a **Plus Jakarta Sans** — más amigable y moderna
- Base font-size: 15px, line-height: 1.6

**Paleta de colores — solo crema / blanco / naranja / negro**
- Eliminado dark mode completamente (sin clases `dark:`)
- Fondo: `#fdf7f0` (crema cálida) en toda la app
- Eliminados todos los emojis con colores del sistema: `📊 🔍 💡 ⚙️ 🔌 🗑` → reemplazados por íconos Lucide naranja
- Botones primarios: `bg-accent` (naranja)
- Botones secundarios: `bg-gray-900` (negro)
- Ghost buttons: borde gris, hover negro

**Auditoría UX/UI — inconsistencias corregidas**
- Border-radius estandarizado: `rounded-xl` (interactivos) / `rounded-2xl` (cards/modals) / `rounded-full` (pills)
- Sombra jerarquizada: `shadow-sm` (cards) → `shadow-md` (hover) → `shadow-xl` (modals)
- `bg-gray-50` (gris frío) en Recomendaciones → `bg-[#fdf7f0]` (crema cálida)
- `shadow-lg shadow-black/5` en ChatInput → `shadow-md shadow-orange-100/60`
- Ícono size=17 → 16 en Header
- `border-2` → `border` en FilterBar selects

---

#### Decisiones de diseño

- El análisis es **siempre por empresa**: el filtro empresa es obligatorio, los prompts de Gemini no sugieren comparar entre empresas
- Los emojis del OS no son controlables con CSS — se reemplazan con íconos SVG
- `rounded-xl` como radio estándar para toda la UI interactiva
- Naranja solo para CTAs, accents y highlights — nunca como fondo de página

---

#### Estado actual del proyecto

- Backend corriendo en `http://localhost:3001`
- Frontend corriendo en `http://localhost:5173`
- Logo: colocar imagen en `frontend/public/logo.png` para que aparezca en el header
- Pendiente: formato porcentaje y escala de colores en tablas (rate columns)

---

## Sesión 1 — 2026-03-16

### Definición del proyecto y construcción del MVP

**Stack definido:**
- Frontend: React + Tailwind CSS + Vite
- Backend: Node.js + Express
- IA: Google Gemini API (`gemini-1.5-pro`)
- Base de datos de análisis: Google BigQuery
- Persistencia local: SQLite (`better-sqlite3`)
- Gráficos: Recharts
- Exportación: PapaParse
- Single user, uso local

**Tabla principal de BigQuery:**
- `atom-ai-labs-ad1fa.conversational_ai_lab.outbound_analysis`

**Credenciales configuradas:**
- Gemini API Key → `backend/.env`
- Service Account JSON → `backend/credentials/service_account.json`
- SQLite DB → migrado a JSON en `backend/data/`

**Archivos creados:**

Backend:
- `backend/index.js` — entrypoint Express
- `backend/services/db.js` — persistencia JSON (config + historial)
- `backend/services/gemini.js` — cliente Gemini (generateSQL + summarizeResults)
- `backend/services/bigquery.js` — cliente BigQuery con schema auto-detección
- `backend/routes/config.js` — GET /api/config/load, POST /api/config/save
- `backend/routes/bigquery.js` — POST /api/bq/test, /api/bq/query, /api/bq/companies, DELETE /api/bq/schema-cache
- `backend/routes/chat.js` — POST /api/chat (flujo completo)
- `backend/routes/history.js` — GET /api/history, DELETE /api/history/clear

Frontend:
- `frontend/src/App.jsx`
- `frontend/src/api.js`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/Settings.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/FilterBar.jsx`
- `frontend/src/components/ChatInput.jsx`
- `frontend/src/components/SuggestedActions.jsx`
- `frontend/src/components/LoadingCard.jsx`
- `frontend/src/components/ResponseCard.jsx`
- `frontend/src/components/DataTable.jsx`
- `frontend/src/components/ChartView.jsx`
- `frontend/src/components/SqlModal.jsx`
- `frontend/src/components/FieldsModal.jsx`

**Flujo de chat:**
1. Usuario hace pregunta con filtros activos
2. Backend llama a Gemini con schema real + resultado previo
3. Gemini decide: `query_bigquery` o `compute_from_data`
4. Segunda llamada a Gemini para análisis estructurado
5. Respuesta: análisis + recomendaciones + tabla + follow-ups + SQL

---
