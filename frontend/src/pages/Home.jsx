import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import ChatInput from '../components/ChatInput'
import SuggestedActions from '../components/SuggestedActions'
import ResponseCard from '../components/ResponseCard'
import LoadingCard from '../components/LoadingCard'
import FieldsModal from '../components/FieldsModal'
import { loadConfig, sendChat, getHistory, clearHistory, getFlows, getTableDescription } from '../api'

const PHRASES = [
  { emoji: '📊', text: 'Entendé tus campañas.' },
  { emoji: '✍️', text: 'Mejorá tus templates.' },
  { emoji: '🎯', text: 'Descubrí qué mensajes convierten.' },
  { emoji: '👥', text: 'Conocé a tu audiencia.' },
  { emoji: '🚀', text: 'Optimizá cada envío.' },
  { emoji: '💡', text: 'Tomá decisiones con datos reales.' },
]

export default function Home() {
  const navigate = useNavigate()
  const DEFAULT_CONFIG = {
    tables: [
      { id: 'outbound_analysis', label: 'Análisis Outbound', fullName: 'atom-ai-labs-ad1fa.conversational_ai_lab.outbound_analysis' },
      { id: 'first_30_messages_last_30_days', label: 'Análisis Conversaciones Inbound', fullName: 'atom-ai-labs-ad1fa.conversational_ai_lab.first_30_messages_last_30_days' }
    ],
    tableDoc: '',
    basePrompt: ''
  }
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [filters, setFilters] = useState({
    tableId:  localStorage.getItem('atom_table_id') || 'outbound_analysis',
    days:     parseInt(localStorage.getItem('atom_days')    || '7'),
    company:  localStorage.getItem('atom_company') || '',
    limit:    parseInt(localStorage.getItem('atom_limit')   || '200'),
    flowName: null
  })
  const [flows, setFlows] = useState([])
  const [tableDescription, setTableDescription] = useState({ description: '', columns: [] })
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [showFields, setShowFields] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const savedTableId = localStorage.getItem('atom_table_id') || 'outbound_analysis'
    loadConfig(savedTableId)
      .then(cfg => setConfig(cfg))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % PHRASES.length), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isInbound = filters.tableId === 'first_30_messages_last_30_days'

  useEffect(() => {
    if (!filters.tableId) return
    getTableDescription(filters.tableId)
      .then(data => setTableDescription(data))
      .catch(() => setTableDescription({ description: '', columns: [] }))
  }, [filters.tableId])

  useEffect(() => {
    if (!isInbound || !filters.company) { setFlows([]); return }
    getFlows(filters.tableId, filters.days, filters.company)
      .then(list => setFlows(list))
      .catch(() => setFlows([]))
  }, [isInbound, filters.tableId, filters.days, filters.company])

  const getActiveTableName = () =>
    config?.tables?.find(t => t.id === filters.tableId)?.fullName || ''

  const getLastResult = () => {
    const last = [...messages].reverse().find(m => m.type === 'assistant' && m.data)
    return last?.data?.results || []
  }

  const getActiveTableLabel = () =>
    config?.tables?.find(t => t.id === filters.tableId)?.label || filters.tableId

  const getClientConfig = () => ({
    tableDoc:   localStorage.getItem(`atom_table_doc_${filters.tableId}`)   || '',
    basePrompt: localStorage.getItem(`atom_base_prompt_${filters.tableId}`) || ''
  })

  const handleSend = async (question) => {
    if (!question.trim() || loading || !filters.company) return
    setMessages(prev => [
      ...prev,
      { type: 'user', text: question },
      { type: 'assistant', loading: true }
    ])
    setLoading(true)
    try {
      const result = await sendChat({
        question,
        filters: { table: getActiveTableName(), days: filters.days, company: filters.company, limit: filters.limit, flowName: filters.flowName },
        previousResult: getLastResult(),
        ...getClientConfig()
      })
      setMessages(prev => [...prev.slice(0, -1), { type: 'assistant', data: result, question }])
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { type: 'assistant', error: err.response?.data?.error || 'Error al procesar tu pregunta. Verificá la configuración.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async (question, index) => {
    if (loading) return
    setLoading(true)
    setMessages(prev => { const u = [...prev]; u[index] = { type: 'assistant', loading: true }; return u })
    try {
      const result = await sendChat({
        question,
        filters: { table: getActiveTableName(), days: filters.days, company: filters.company, limit: filters.limit, flowName: filters.flowName },
        previousResult: [],
        ...getClientConfig()
      })
      setMessages(prev => { const u = [...prev]; u[index] = { type: 'assistant', data: result, question }; return u })
    } catch (err) {
      setMessages(prev => { const u = [...prev]; u[index] = { type: 'assistant', error: err.response?.data?.error || 'Error al regenerar.' }; return u })
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = async () => {
    setMessages([])
    await clearHistory()
  }

  const handleShowHistory = async () => {
    const h = await getHistory()
    setHistory(h)
    setShowHistory(true)
  }

  const handleHistoryItem = (item) => {
    setShowHistory(false)
    setMessages([
      { type: 'user', text: item.question },
      { type: 'assistant', data: { respuesta: item.respuesta || '', followups: item.followups || [], results: item.raw_results || [], sql: item.sql_query, action: item.action }, question: item.question }
    ])
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen bg-[#fdf7f0]">
      <Header onHistoryClick={handleShowHistory} />

      <div className="h-14 shrink-0" />

      {/* Active filters bar */}
      {filters.company ? (
        <div className="px-6 py-2 border-b border-orange-100 bg-white/60 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span className="font-semibold text-gray-700">{getActiveTableLabel()}</span>
          <span>·</span>
          <span className="font-bold text-accent">{filters.company}</span>
          <span>·</span>
          <span>Últimos {filters.days} días</span>
          <span>·</span>
          <span>{filters.limit} registros</span>
          {isInbound && flows.length > 0 && (
            <>
              <span>·</span>
              <select
                value={filters.flowName || ''}
                onChange={e => setFilters(f => ({ ...f, flowName: e.target.value || null }))}
                className="bg-white border border-orange-200 text-xs text-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:border-accent cursor-pointer font-semibold appearance-none pr-5"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
              >
                <option value="">Todos los flujos</option>
                {flows.map(f => (
                  <option key={f.flow_name} value={f.flow_name}>
                    {f.flow_name} ({f.total})
                  </option>
                ))}
              </select>
            </>
          )}
          <a href="/settings" className="ml-auto text-gray-400 hover:text-accent transition-colors">Cambiar</a>
        </div>
      ) : (
        <div className="px-6 py-2 border-b border-orange-100 bg-orange-50 flex items-center gap-2 text-xs text-orange-600">
          <span>⚠ No hay empresa configurada.</span>
          <a href="/settings" className="font-semibold underline hover:text-accent">Ir a Configuración</a>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] max-w-3xl mx-auto w-full">
            <div key={phraseIdx} className="phrase-fade flex flex-col items-center mb-8 gap-2">
              <span className="text-4xl">{PHRASES[phraseIdx].emoji}</span>
              <h1 className="text-3xl font-bold text-gray-900 text-center">{PHRASES[phraseIdx].text}</h1>
            </div>

            <div className="w-full relative">
              <ChatInput onSubmit={handleSend} disabled={loading} large />
              <button
                onClick={() => setShowFields(true)}
                className="absolute -bottom-8 right-0 flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/30 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg transition-colors"
              >
                <HelpCircle size={12} />
                Ver tabla
              </button>
            </div>

            <SuggestedActions onSelect={handleSend} tableId={filters.tableId} />
          </div>
        ) : (
          <div className="w-full space-y-4 pb-2">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.type === 'user' && (
                  <div className="flex justify-end mb-1">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-gray-700 max-w-2xl shadow-sm">
                      {msg.text}
                    </div>
                  </div>
                )}
                {msg.type === 'assistant' && (
                  <div className="flex justify-start">
                    {msg.loading && <LoadingCard />}
                    {msg.error && (
                      <div className="fade-in px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 max-w-lg">
                        ❌ {msg.error}
                      </div>
                    )}
                    {msg.data && (
                      <ResponseCard data={msg.data} onRegenerate={() => handleRegenerate(msg.question, i)} onFollowUp={handleSend} />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Bottom input */}
      {!isEmpty && (
        <div className="px-6 pb-4 w-full shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={12} /> Limpiar conversación
            </button>
            <button
              onClick={() => setShowFields(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/30 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg transition-colors"
            >
              <HelpCircle size={12} />
              Ver tabla
            </button>
          </div>
          <ChatInput onSubmit={handleSend} disabled={loading} />
        </div>
      )}

      {/* History drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowHistory(false)}>
          <div
            className="ml-auto w-80 bg-white border-l border-gray-200 h-full overflow-y-auto p-4 fade-in shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Historial</h3>
              <button onClick={() => setShowHistory(false)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">✕</button>
            </div>
            {history.length === 0
              ? <p className="text-sm text-gray-400">Sin historial guardado.</p>
              : (
                <div className="space-y-2">
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleHistoryItem(item)}
                      className="w-full text-left p-3 rounded-xl hover:bg-orange-50 border border-gray-100 hover:border-orange-200 transition-colors"
                    >
                      <p className="text-sm text-gray-700 truncate">{item.question}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleString('es-AR')}</p>
                    </button>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* Fields modal */}
      {showFields && (
        <FieldsModal tableDescription={tableDescription} onClose={() => setShowFields(false)} />
      )}
    </div>
  )
}
