import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

// Columns where higher = worse (invert color scale)
const NEGATIVE_PATTERNS = ['error', 'fail', 'failed', 'baja', 'undelivered', 'bounce', 'rebote']

// Only strong rate/percentage name signals — NOT quantity words like open/read/delivered
const RATE_NAME_PATTERNS = ['rate', 'tasa', 'ratio', 'pct', 'percent', 'porcentaje', 'conversion']

function isRateCol(name, allValues) {
  const lower = name.toLowerCase()
  // Strong name match
  if (RATE_NAME_PATTERNS.some(p => lower.includes(p))) return true
  // Value-based: if every value is between 0 and 1 → decimal rate
  const nums = allValues.filter(v => v != null && !isNaN(Number(v)))
  if (nums.length > 0 && nums.every(v => Number(v) >= 0 && Number(v) <= 1)) return true
  return false
}

function isNegativeCol(name) {
  const lower = name.toLowerCase()
  return NEGATIVE_PATTERNS.some(p => lower.includes(p))
}

function isNumeric(value) {
  return value != null && value !== '' && !isNaN(Number(value)) && typeof value !== 'boolean'
}

// Format a rate value: if 0–1 → multiply by 100, then show XX.XX%
function formatRate(value) {
  const n = Number(value)
  const pct = n <= 1 ? n * 100 : n
  return `${pct.toFixed(2)}%`
}

// Returns a pastel HSL background for heatmap: green (120) for high, red (0) for low
function heatmapBg(value, min, max, negative) {
  if (max === min) return 'transparent'
  let ratio = (Number(value) - min) / (max - min)
  if (negative) ratio = 1 - ratio
  const hue = Math.round(ratio * 120) // 0 = red, 120 = green
  return `hsl(${hue}, 65%, 92%)`
}

function formatCell(value) {
  if (value == null) return <span className="text-gray-300">—</span>
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function DataTable({ rows }) {
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-400 py-3 text-center">Sin resultados</p>
  }

  const columns = Object.keys(rows[0])

  // Classify columns
  const numericCols = new Set(
    columns.filter(col => rows.slice(0, 10).every(r => isNumeric(r[col])))
  )
  const rateCols = new Set(
    columns.filter(col => numericCols.has(col) && isRateCol(col, rows.map(r => r[col])))
  )

  // Precompute min/max per rate column (over ALL rows)
  const colStats = {}
  rateCols.forEach(col => {
    const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v))
    colStats[col] = { min: Math.min(...vals), max: Math.max(...vals), negative: isNegativeCol(col) }
  })

  const sorted = [...rows].sort((a, b) => {
    if (!sortCol) return 0
    const va = a[sortCol], vb = b[sortCol]
    if (va == null) return 1
    if (vb == null) return -1
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">{rows.length} registros</span>
        {rateCols.size > 0 && (
          <span className="text-[10px] text-gray-400 italic flex items-center gap-2">
            <span className="inline-flex gap-0.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(0,65%,92%)' }} />
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(60,65%,92%)' }} />
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'hsl(120,65%,92%)' }} />
            </span>
            escala de salud
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-orange-50">
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2.5 text-left font-bold text-accent cursor-pointer hover:text-accent-dark whitespace-nowrap select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:brightness-95 transition-all">
                {columns.map(col => {
                  const isRate = rateCols.has(col)
                  const isNum = numericCols.has(col)
                  const stats = colStats[col]

                  const bgColor = isRate && stats
                    ? heatmapBg(row[col], stats.min, stats.max, stats.negative)
                    : undefined

                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 whitespace-nowrap max-w-xs truncate ${isRate ? 'font-bold text-gray-800 text-center' : isNum ? 'font-bold text-accent' : 'text-gray-700'}`}
                      style={bgColor ? { backgroundColor: bgColor } : undefined}
                      title={String(row[col] ?? '')}
                    >
                      {isRate ? formatRate(row[col]) : formatCell(row[col])}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">Pág {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="p-1 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
