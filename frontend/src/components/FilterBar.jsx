import { useEffect, useState } from 'react'
import { getCompanies, getFlows } from '../api'
import { AlertCircle } from 'lucide-react'

const DAY_OPTIONS   = [7, 15, 30]
const LIMIT_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

const INBOUND_TABLE_ID = 'first_30_messages_last_30_days'

export default function FilterBar({ filters, onChange, tables }) {
  const [companies, setCompanies] = useState([])
  const [loadingCo, setLoadingCo] = useState(false)
  const [flows, setFlows] = useState([])
  const [loadingFlows, setLoadingFlows] = useState(false)

  const isInbound = filters.tableId === INBOUND_TABLE_ID

  useEffect(() => {
    if (!filters.tableId) return
    setLoadingCo(true)
    getCompanies(filters.tableId)
      .then(list => {
        setCompanies(list)
        if (list.length > 0 && !filters.company) {
          onChange({ ...filters, company: list[0] })
        }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoadingCo(false))
  }, [filters.tableId])

  useEffect(() => {
    if (!isInbound || !filters.company) return
    setLoadingFlows(true)
    getFlows(filters.tableId, filters.days, filters.company)
      .then(list => setFlows(list))
      .catch(() => setFlows([]))
      .finally(() => setLoadingFlows(false))
  }, [isInbound, filters.tableId, filters.days, filters.company])

  const selectCls = `
    bg-white border border-orange-200 text-sm text-gray-800
    rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-accent
    shrink-0 cursor-pointer font-semibold shadow-sm hover:border-accent
    transition-colors appearance-none
  `

  const wrapCls = "flex flex-col gap-0.5 shrink-0"
  const labelCls = "text-[10px] font-bold text-accent uppercase tracking-wider pl-0.5"

  return (
    <div className="fixed top-14 left-0 right-0 z-40 px-6 py-3 border-b border-orange-100 bg-[#fdf7f0]/95 backdrop-blur shadow-sm">
      <div className="flex items-end gap-4 overflow-x-auto">

        <div className={wrapCls}>
          <span className={labelCls}>Tabla</span>
          <div className="relative">
            <select value={filters.tableId} onChange={e => onChange({ ...filters, tableId: e.target.value })} className={selectCls}>
              {tables.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">▾</div>
          </div>
        </div>

        <div className={wrapCls}>
          <span className={labelCls}>Período</span>
          <div className="relative">
            <select value={filters.days} onChange={e => onChange({ ...filters, days: parseInt(e.target.value) })} className={selectCls}>
              {DAY_OPTIONS.map(d => <option key={d} value={d}>Últimos {d} días</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">▾</div>
          </div>
        </div>

        <div className={wrapCls}>
          <span className={labelCls}>
            Empresa
            {!filters.company && !loadingCo && (
              <span className="ml-1 text-red-400 normal-case tracking-normal font-normal">(requerida)</span>
            )}
          </span>
          <div className="relative">
            <select
              value={filters.company}
              onChange={e => onChange({ ...filters, company: e.target.value })}
              className={`${selectCls} ${!filters.company && !loadingCo ? 'border-red-300' : ''}`}
              disabled={loadingCo}
            >
              {loadingCo
                ? <option value="">Cargando empresas...</option>
                : companies.length === 0
                  ? <option value="">Sin empresas disponibles</option>
                  : companies.map(c => <option key={c} value={c}>{c}</option>)
              }
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">▾</div>
          </div>
        </div>

        {isInbound && (
          <div className={wrapCls}>
            <span className={labelCls}>Flujo</span>
            <div className="relative">
              <select
                value={filters.flowName || ''}
                onChange={e => onChange({ ...filters, flowName: e.target.value || null })}
                className={selectCls}
                disabled={loadingFlows || !filters.company}
              >
                <option value="">Todos los flujos</option>
                {loadingFlows
                  ? <option disabled>Cargando flujos...</option>
                  : flows.map(f => (
                      <option key={f.flow_name} value={f.flow_name}>
                        {f.flow_name} ({f.total})
                      </option>
                    ))
                }
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">▾</div>
            </div>
          </div>
        )}

        <div className={wrapCls}>
          <span className={labelCls}>Límite</span>
          <div className="relative">
            <select value={filters.limit} onChange={e => onChange({ ...filters, limit: parseInt(e.target.value) })} className={selectCls}>
              {LIMIT_OPTIONS.map(l => <option key={l} value={l}>{l} registros</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">▾</div>
          </div>
        </div>

        {!filters.company && !loadingCo && companies.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2 shrink-0">
            <AlertCircle size={13} />
            Seleccioná una empresa para continuar
          </div>
        )}
      </div>
    </div>
  )
}
