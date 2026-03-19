import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Play, CheckCircle, XCircle, Pencil, X, Settings2, Plug } from 'lucide-react'
import { loadConfig, saveConfig, testBQ, getCompanies, clearSchemaCache } from '../api'

function EditModal({ title, description, value, onChange, onClose, onSave, saving, placeholder, mono }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-200 fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden px-6 py-4">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full h-full min-h-[340px] bg-orange-50/60 border border-orange-100 text-sm text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-accent/50 placeholder-gray-400 resize-none transition-colors ${mono ? 'font-mono text-xs leading-relaxed' : ''}`}
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            {saving ? <CheckCircle size={14} /> : <Save size={14} />}
            {saving ? '¡Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [tableDoc, setTableDoc] = useState('')
  const [basePrompt, setBasePrompt] = useState('')
  const [tables, setTables] = useState([])
  const [saved, setSaved] = useState(false)
  const [editModal, setEditModal] = useState(null)

  const [testTableId, setTestTableId] = useState('')
  const [testDays, setTestDays] = useState(parseInt(localStorage.getItem('atom_days') || '7'))
  const [testCompany, setTestCompany] = useState(localStorage.getItem('atom_company') || '')
  const [testLimit, setTestLimit] = useState(parseInt(localStorage.getItem('atom_limit') || '100'))
  const [testResult, setTestResult] = useState(null)
  const [testLoading, setTestLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [loadingCo, setLoadingCo] = useState(false)
  const [schemaCleared, setSchemaCleared] = useState(false)
  const [filtersSaved, setFiltersSaved] = useState(false)

  const selectCls = "w-full bg-orange-50 border border-orange-100 text-sm text-gray-800 rounded-xl px-3 py-2 focus:outline-none focus:border-accent/50 cursor-pointer"
  const labelCls = "block text-xs font-bold text-accent mb-1.5"

  useEffect(() => {
    const savedTableId = localStorage.getItem('atom_table_id') || 'outbound_analysis'
    loadConfig(savedTableId).then(cfg => {
      setTables(cfg.tables || [])
      setTestTableId(savedTableId)
      setTableDoc(localStorage.getItem(`atom_table_doc_${savedTableId}`) || cfg.tableDoc || '')
      setBasePrompt(localStorage.getItem(`atom_base_prompt_${savedTableId}`) || cfg.basePrompt || '')
    })
  }, [])

  useEffect(() => {
    if (!testTableId) return
    // cargar config específica de la tabla seleccionada
    setTableDoc(localStorage.getItem(`atom_table_doc_${testTableId}`) || '')
    setBasePrompt(localStorage.getItem(`atom_base_prompt_${testTableId}`) || '')
    // cargar empresas de la tabla seleccionada
    setLoadingCo(true)
    getCompanies(testTableId)
      .then(list => setCompanies(list))
      .catch(() => setCompanies([]))
      .finally(() => setLoadingCo(false))
  }, [testTableId])

  const handleSaveFromModal = async () => {
    localStorage.setItem(`atom_table_doc_${testTableId}`,   tableDoc)
    localStorage.setItem(`atom_base_prompt_${testTableId}`, basePrompt)
    await saveConfig({ tableDoc, basePrompt, tableId: testTableId }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setEditModal(null)
  }

  const handleSaveFilters = () => {
    if (!testCompany) return
    localStorage.setItem('atom_table_id', testTableId)
    localStorage.setItem('atom_company',  testCompany)
    localStorage.setItem('atom_days',     String(testDays))
    localStorage.setItem('atom_limit',    String(testLimit))
    setFiltersSaved(true)
    setTimeout(() => setFiltersSaved(false), 2500)
  }

  const handleTest = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await testBQ({ tableId: testTableId, days: testDays, company: testCompany, limit: testLimit })
      setTestResult({ success: true, ...result })
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || 'Error de conexión con BigQuery' })
    } finally {
      setTestLoading(false)
    }
  }

  const docPreview = tableDoc ? tableDoc.slice(0, 120) + (tableDoc.length > 120 ? '…' : '') : null
  const promptPreview = basePrompt ? basePrompt.slice(0, 120) + (basePrompt.length > 120 ? '…' : '') : null

  return (
    <div className="min-h-screen bg-[#fdf7f0]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 h-14 border-b border-gray-200 bg-[#fdf7f0]/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft size={17} />
          </button>
          <div>
            <span className="font-bold text-gray-900 text-sm">ATOM</span>
            <span className="text-gray-400 text-sm"> · Configuración</span>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-56px)]">

        {/* ── LEFT: Configuration ── */}
        <div className="overflow-y-auto p-6 border-r border-gray-100">
          <h2 className="text-sm font-bold text-accent mb-5 flex items-center gap-1.5"><Settings2 size={14} /> Configuración</h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-orange-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Documentación de tablas</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">Describí los campos y su significado. Se inyecta en cada llamada a la IA.</p>
                  {docPreview
                    ? <p className="text-xs text-gray-500 font-mono bg-orange-50 rounded-xl px-3 py-2 truncate">{docPreview}</p>
                    : <p className="text-xs text-gray-400 italic">Sin documentación cargada</p>
                  }
                </div>
                <button
                  onClick={() => setEditModal('tableDoc')}
                  className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-semibold transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-orange-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Prompt base del sistema</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2">Define el tono y comportamiento de la IA.</p>
                  {promptPreview
                    ? <p className="text-xs text-gray-500 bg-orange-50 rounded-xl px-3 py-2 truncate">{promptPreview}</p>
                    : <p className="text-xs text-gray-400 italic">Sin prompt configurado</p>
                  }
                </div>
                <button
                  onClick={() => setEditModal('basePrompt')}
                  className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-semibold transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Filters + Test connection ── */}
        <div className="overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-accent flex items-center gap-1.5"><Plug size={14} /> Filtros y conexión</h2>
            <button
              onClick={async () => {
                await clearSchemaCache(testTableId)
                setSchemaCleared(true)
                setTimeout(() => setSchemaCleared(false), 2500)
              }}
              className="text-xs text-gray-400 hover:text-accent font-medium transition-colors"
            >
              {schemaCleared ? '✓ Cache limpiado' : '↺ Refrescar esquema'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Tipo de análisis</label>
                <select value={testTableId} onChange={e => setTestTableId(e.target.value)} className={selectCls}>
                  {tables.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Días hacia atrás</label>
                <select value={testDays} onChange={e => setTestDays(parseInt(e.target.value))} className={selectCls}>
                  {[7, 15, 30].map(d => <option key={d} value={d}>Últimos {d} días</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Empresa <span className="text-red-400">*</span></label>
                <select value={testCompany} onChange={e => setTestCompany(e.target.value)} className={selectCls} disabled={loadingCo}>
                  <option value="">{loadingCo ? 'Cargando...' : '— Seleccioná una empresa —'}</option>
                  {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Límite de registros</label>
                <select value={testLimit} onChange={e => setTestLimit(parseInt(e.target.value))} className={selectCls}>
                  {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(l => (
                    <option key={l} value={l}>{l} registros</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveFilters}
              disabled={!testCompany}
              className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm rounded-xl transition-colors disabled:opacity-40 font-semibold shadow-sm"
            >
              <Save size={13} />
              {filtersSaved ? '¡Filtros guardados!' : 'Guardar filtros por defecto'}
            </button>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-3 font-medium">Probar conexión con estos filtros</p>
              <button
                onClick={handleTest}
                disabled={testLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-sm rounded-xl transition-colors disabled:opacity-50 font-semibold"
              >
                <Play size={13} />
                {testLoading ? 'Ejecutando...' : 'Correr Query'}
              </button>
            </div>

            {testResult && (
              <div className="fade-in space-y-3">
                {testResult.success ? (
                  <>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-accent">
                      <CheckCircle size={14} />
                      Conexión exitosa — <span className="font-bold">{testResult.count} registros</span>
                    </div>
                    <pre className="text-xs text-gray-500 bg-orange-50 rounded-xl p-3 overflow-x-auto font-mono border border-orange-100">
                      {testResult.sql}
                    </pre>
                    {testResult.rows?.length > 0 && (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-64">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 bg-orange-50">
                              {Object.keys(testResult.rows[0]).map(col => (
                                <th key={col} className="px-3 py-2 text-left font-bold text-accent whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {testResult.rows.slice(0, 10).map((row, i) => (
                              <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/40">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(val ?? '—')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-xl border border-red-200">
                    <XCircle size={14} className="mt-0.5 shrink-0" />
                    {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editModal === 'tableDoc' && (
        <EditModal
          title="Documentación de tablas"
          description="Describí los campos y su significado. Se inyecta en cada llamada a la IA."
          value={tableDoc}
          onChange={setTableDoc}
          onClose={() => setEditModal(null)}
          onSave={handleSaveFromModal}
          saving={saved}
          placeholder={`Tabla: outbound_analysis\nCampos:\n- company_name: nombre de la empresa\n- campaign_name: nombre de la campaña\n...`}
          mono
        />
      )}
      {editModal === 'basePrompt' && (
        <EditModal
          title="Prompt base del sistema"
          description="Define el tono y comportamiento de la IA."
          value={basePrompt}
          onChange={setBasePrompt}
          onClose={() => setEditModal(null)}
          onSave={handleSaveFromModal}
          saving={saved}
          placeholder="Sos un analista experto en campañas de WhatsApp..."
        />
      )}
    </div>
  )
}
