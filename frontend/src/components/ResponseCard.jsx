import { useState } from 'react'
import { Download, RefreshCw, Copy, Check, Code2, ChevronRight, SearchCheck, Lightbulb, TableProperties, MessageCircleQuestion } from 'lucide-react'
import Papa from 'papaparse'
import DataTable from './DataTable'
import SqlModal from './SqlModal'

export default function ResponseCard({ data, onRegenerate, onFollowUp }) {
  const { analisis = [], recomendaciones = [], followups = [], results, sql, action } = data
  const [showSQL, setShowSQL] = useState(false)
  const [copied, setCopied] = useState(false)

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
    const text = [
      '🔍 Análisis',
      ...analisis.map(b => `• ${b}`),
      '',
      '💡 Recomendaciones',
      ...recomendaciones.map(b => `• ${b}`)
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ghostBtn = "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors bg-white"

  const tableRows = (() => {
    if (!results?.length) return []
    const numericCol = Object.keys(results[0]).find(k =>
      results.slice(0, 5).every(r => r[k] != null && !isNaN(Number(r[k])))
    )
    if (!numericCol) return results.slice(0, 5)
    return [...results]
      .sort((a, b) => Number(b[numericCol]) - Number(a[numericCol]))
      .slice(0, 5)
  })()

  return (
    <div className="fade-in bg-white rounded-2xl border border-gray-200 p-5 w-full shadow-sm space-y-5">

      {/* ── 1+2. Análisis | Recomendaciones (2 columnas) ── */}
      {(analisis.length > 0 || recomendaciones.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analisis.length > 0 && (
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-xs font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <SearchCheck size={12} /> Análisis
              </p>
              <ul className="space-y-2.5">
                {analisis.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-accent font-bold mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recomendaciones.length > 0 && (
            <div className="bg-[#fdf7f0] rounded-xl p-4 border border-orange-100">
              <p className="text-xs font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lightbulb size={12} /> Recomendaciones
              </p>
              <ul className="space-y-2.5">
                {recomendaciones.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-accent font-bold mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Tabla resumen (full width) ── */}
      {tableRows.length > 0 && (
        <div>
          <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TableProperties size={12} /> Tabla resumen
          </p>
          <DataTable rows={tableRows} />
          {results.length > 5 && (
            <p className="text-xs text-gray-400 mt-1.5 text-right">
              * Solo se muestran los 5 principales resultados
            </p>
          )}
        </div>
      )}

      {/* ── 4. Follow-up buttons (centrados) ── */}
      {followups.length > 0 && (
        <div className="flex flex-col items-center gap-3 py-1">
          <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircleQuestion size={12} /> ¿Querés profundizar?
          </p>
          {followups.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUp(q)}
              className="flex items-center justify-between gap-3 w-full max-w-xl text-left px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-accent hover:border-accent text-sm text-gray-700 hover:text-white transition-all group shadow-sm font-medium"
            >
              <span>{q}</span>
              <ChevronRight size={15} className="shrink-0 text-gray-300 group-hover:text-white transition-colors" />
            </button>
          ))}
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
