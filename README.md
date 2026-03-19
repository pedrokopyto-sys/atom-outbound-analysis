# ATOM — Análisis Outbound

App de análisis conversacional de campañas de WhatsApp conectada a BigQuery, potenciada por Google Gemini.

## Descripción

Permite hacer preguntas en lenguaje natural sobre datos de campañas outbound de una empresa específica. La app traduce las preguntas a SQL sobre BigQuery, ejecuta las queries y devuelve una respuesta directa de consultor con preguntas de profundización y acceso a la tabla de datos completa.

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Tipografía | Plus Jakarta Sans |
| Backend | Node.js + Express |
| IA | Google Gemini API (`gemini-2.0-flash`) |
| Base de datos | Google BigQuery |
| Persistencia local | JSON (`backend/data/`) — solo en desarrollo local |
| Autenticación GCP | Service Account (JSON) |
| Gráficos | Recharts |
| Exportación | PapaParse |
| Deploy | Vercel (frontend + serverless functions) |

## Arquitectura

```
Usuario (browser)
  │
  ▼
React Frontend (http://localhost:5173 / Vercel)
  │   /         → panel conversacional
  │   /settings → configuración
  ▼
Node.js + Express (http://localhost:3001 / Vercel Functions /api/server)
  ├── Gemini API   → generateSQL + summarizeResults
  ├── BigQuery     → ejecución de queries + schema detection
  └── JSON files  → config.json + history.json (solo local; Vercel usa memoria)
```

## Flujo de una consulta

1. Usuario selecciona **empresa** (obligatorio) + período + límite
2. Escribe pregunta en lenguaje natural
3. Backend inyecta schema real de la tabla + documentación + resultado previo
4. Gemini decide: **`query_bigquery`** (nueva query) o **`compute_from_data`** (opera sobre datos anteriores)
5. Segunda llamada a Gemini genera respuesta estructurada:
   - **Respuesta** — párrafo único de consultor, máx. 3 oraciones, con datos concretos
   - **Follow-ups** — 2 preguntas consultables contra la misma tabla
   - **Tabla de datos** — se muestra solo si el usuario presiona "Ver tabla de datos"
6. Respuesta guardada en historial

## Deploy en Vercel

Variables de entorno requeridas en Vercel:

| Key | Descripción |
|---|---|
| `GEMINI_API_KEY` | API key de Google Gemini |
| `GCP_SERVICE_ACCOUNT` | Contenido completo del `service_account.json` en una línea |

> **Nota**: El historial de conversaciones no persiste entre requests en Vercel (filesystem efímero). La config de tableDoc y basePrompt se guarda en `localStorage` del browser.

## Estructura del Proyecto

```
outbound_chat_analysis/
├── README.md
├── CHANGELOG.md
├── CREDENTIALS.md
├── package.json                          # deps para Vercel Functions
├── vercel.json                           # config de deploy
├── api/
│   └── server.js                         # entry point Vercel (wraps Express)
├── backend/
│   ├── index.js
│   ├── .env                          # GEMINI_API_KEY, PORT
│   ├── data/
│   │   ├── config.json               # configuración persistente
│   │   └── history.json              # historial de conversaciones
│   ├── credentials/
│   │   └── service_account.json      # GCP service account (no commitear)
│   ├── routes/
│   │   ├── chat.js                   # POST /api/chat
│   │   ├── config.js                 # GET+POST /api/config
│   │   ├── bigquery.js               # /api/bq/*
│   │   └── history.js                # /api/history/*
│   └── services/
│       ├── gemini.js                 # generateSQL + summarizeResults
│       ├── bigquery.js               # runQuery + getTableSchema
│       └── db.js                     # getConfig/setConfig + saveHistory
└── frontend/
    ├── public/
    │   └── logo.png                  # logo de la app (colocar aquí)
    ├── index.html
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── api.js
        ├── index.css
        ├── pages/
        │   ├── Home.jsx
        │   └── Settings.jsx
        └── components/
            ├── Header.jsx
            ├── FilterBar.jsx
            ├── ChatInput.jsx
            ├── SuggestedActions.jsx
            ├── LoadingCard.jsx
            ├── ResponseCard.jsx
            ├── DataTable.jsx
            ├── ChartView.jsx
            ├── SqlModal.jsx
            └── FieldsModal.jsx
```

## Instalación

```bash
# Backend
cd backend
npm install
node index.js        # corre en http://localhost:3001

# Frontend (otra terminal)
cd frontend
npm install
npm run dev          # corre en http://localhost:5173
```

## Variables de entorno (`backend/.env`)

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

## Endpoints Backend

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/chat` | Flujo completo: genera SQL → ejecuta → analiza |
| GET | `/api/config/load` | Carga configuración guardada |
| POST | `/api/config/save` | Guarda tableDoc y basePrompt |
| POST | `/api/bq/test` | Ejecuta query de prueba |
| GET | `/api/bq/companies` | Lista empresas DISTINCT de la tabla |
| DELETE | `/api/bq/schema-cache` | Fuerza refresco del schema |
| GET | `/api/history` | Últimas 50 conversaciones |
| DELETE | `/api/history/clear` | Limpia historial |

## Paleta de colores

| Uso | Valor |
|---|---|
| Fondo global | `#fdf7f0` (crema cálida) |
| Superficies / cards | `#ffffff` (blanco) |
| Acento / CTAs | `#f97316` (naranja) |
| Texto principal | `#1a1a1a` (negro) |
| Botones secundarios | `#111827` (gray-900) |

## Notas de diseño

- **Empresa obligatoria**: el filtro de empresa es siempre requerido. El análisis es por empresa específica, no global.
- **Logo**: colocar imagen en `frontend/public/logo.png`. Si no existe, muestra fallback con texto "ATOM".
- **Schema cache**: el schema de BigQuery se cachea en memoria y en `config.json`. Para forzar re-lectura: botón "Refrescar esquema" en Settings.
- **Sin dark mode**: la app usa únicamente modo claro con paleta crema/blanco/naranja/negro.

## Seguridad

- Service account JSON nunca se expone al frontend
- Solo se permiten queries `SELECT` (se bloquean INSERT, UPDATE, DELETE, DROP, etc.)
- Rango máximo de datos: **30 días hacia atrás**
- App de **un solo usuario**
- Deploy en Vercel: credenciales via variables de entorno, nunca en el repo
