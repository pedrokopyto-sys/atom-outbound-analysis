import { useState } from 'react'
import { Download, RefreshCw, Copy, Check, Code2, ChevronRight, TableProperties, MessageCircleQuestion } from 'lucide-react'
import Papa from 'papaparse'
import DataTable from './DataTable'
import SqlModal from './SqlModal'

export default function ResponseCard({ data, onRegenerate, onFollowUp }) {
  const { respuesta = '', followups = [], results, sql, action } = data
  const [showSQL, setShowSQL] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTable, setShowTable] = useState(false)

  const handleExportCSV = () => {
    const csv = Papa.unparse(results)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(respuesta)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ghostBtn = "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors bg-white"

  return (
    <div className="fade-in bg-white rounded-2xl border border-gray-200 p-5 w-full shadow-sm space-y-5">

      {/* ── 1. Respuesta ── */}
      {respuesta && (
        <p className="text-sm text-gray-800 leading-relaxed">{respuesta}</p>
      )}

      {/* ── 3. Follow-up buttons (izquierda) ── */}
      {followups.length > 0 && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircleQuestion size={12} /> ¿Querés profundizar?
          </p>
          {followups.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUp(q)}
              className="flex items-center gap-3 text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-accent hover:border-accent text-sm text-gray-700 hover:text-white transition-all group shadow-sm font-medium"
            >
              <ChevronRight size={14} className="shrink-0 text-gray-300 group-hover:text-white transition-colors" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 4. Ver tabla de datos ── */}
      {results?.length > 0 && (
        <div>
          {!showTable ? (
            <button
              onClick={() => setShowTable(true)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-accent text-accent font-bold text-sm transition-all group"
            >
              <TableProperties size={18} className="group-hover:scale-110 transition-transform" />
              Ver tabla de datos ({results.length} registros)
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <TableProperties size={12} /> Tabla de datos
                </p>
                <button onClick={() => setShowTable(false)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  Ocultar
                </button>
              </div>
              <DataTable rows={results} />
            </div>
          )}
        </div>
      )}

      {/* ── 5. Actions bar ── */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
        {sql && (
          <button
            onClick={() => setShowSQL(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold transition-colors"
          >
            <Code2 size={12} />
            Ver Query
          </button>
        )}
        {results?.length > 0 && (
          <button onClick={handleExportCSV} className={ghostBtn}>
            <Download size={12} />Exportar CSV
          </button>
        )}
        <button onClick={onRegenerate} className={ghostBtn}>
          <RefreshCw size={12} />Regenerar
        </button>
        <button onClick={handleCopy} className={ghostBtn}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado' : 'Copiar análisis'}
        </button>
        {action === 'compute_from_data' && (
          <span className="ml-auto text-xs text-gray-400 italic">calculado desde datos previos</span>
        )}
      </div>

      {showSQL && sql && <SqlModal sql={sql} onClose={() => setShowSQL(false)} />}
    </div>
  )
}
