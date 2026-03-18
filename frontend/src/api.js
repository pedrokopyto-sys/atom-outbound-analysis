import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const loadConfig    = ()             => api.get('/config/load').then(r => r.data)
export const saveConfig    = (data)         => api.post('/config/save', data).then(r => r.data)
export const testBQ        = (data)         => api.post('/bq/test', data).then(r => r.data)
export const getCompanies    = (tableId) => api.get(`/bq/companies?tableId=${tableId}&days=30`).then(r => r.data)
export const clearSchemaCache = (tableId) => api.delete(`/bq/schema-cache?tableId=${tableId}`).then(r => r.data)
export const sendChat      = (data)         => api.post('/chat', data).then(r => r.data)
export const getHistory    = ()             => api.get('/history').then(r => r.data)
export const clearHistory  = ()             => api.delete('/history/clear').then(r => r.data)
