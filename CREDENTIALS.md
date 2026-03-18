# Credenciales del Proyecto

Documento de referencia para saber qué credenciales necesita la app, cómo obtenerlas y dónde van guardadas.

> ⚠️ Este archivo documenta la estructura. Nunca escribir valores reales de credenciales aquí.

---

## 1. Gemini API Key

| Atributo | Detalle |
|---|---|
| **Qué es** | API Key para autenticarse contra Google Gemini |
| **Dónde obtenerla** | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Dónde se guarda** | `backend/.env` → variable `GEMINI_API_KEY` |
| **Formato** | String alfanumérico |

### Ejemplo de uso en `backend/.env`
```
GEMINI_API_KEY=AIza...
PORT=3001
```

---

## 2. Service Account JSON (BigQuery)

| Atributo | Detalle |
|---|---|
| **Qué es** | Credencial de Google Cloud para autenticarse con BigQuery |
| **Dónde obtenerla** | GCP Console → IAM & Admin → Service Accounts → crear clave JSON |
| **Permisos mínimos necesarios** | `BigQuery Data Viewer` + `BigQuery Job User` |
| **Dónde se guarda** | SQLite (`config` table, columna `service_account_json`) |
| **Cómo se carga** | Se sube desde la UI en `/settings` → el backend lo persiste en la DB |
| **Nunca va a** | Frontend, localStorage, archivo en disco commiteado |

### Campos que debe tener el JSON (validación en app)
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key": "...",
  "client_email": "..."
}
```

---

## 3. Proyecto y Tabla de BigQuery

| Atributo | Valor |
|---|---|
| **Project ID** | `atom-ai-labs-ad1fa` |
| **Dataset** | `conversational_ai_lab` |
| **Tabla principal** | `outbound_analysis` |
| **Referencia completa** | `atom-ai-labs-ad1fa.conversational_ai_lab.outbound_analysis` |

---

## Resumen de ubicaciones

| Credencial | Ubicación | Commiteado |
|---|---|---|
| Gemini API Key | `backend/.env` | ❌ No |
| Service Account JSON | SQLite (`backend/data/app.db`) | ❌ No |
| Referencia de tablas BQ | `CREDENTIALS.md` (este archivo) | ✅ Sí |

---

## `.gitignore` relevante

```
backend/.env
backend/data/
backend/node_modules/
```
