import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import FilterBar from '../components/FilterBar'
import ChatInput from '../components/ChatInput'
import SuggestedActions from '../components/SuggestedActions'
import ResponseCard from '../components/ResponseCard'
import LoadingCard from '../components/LoadingCard'
import FieldsModal from '../components/FieldsModal'
import { loadConfig, sendChat, getHistory, clearHistory } from '../api'

const PHRASES = [
  'Entendé tus campañas.',
  'Mejorá tus templates.',
  'Descubrí qué mensajes convierten.',
  'Conocé a tu audiencia.',
  'Optimizá cada envío.',
  'Tomá decisiones con datos reales.'
]

export default function Home() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(null)
  const [filters, setFilters] = useState({ tableId: '', days: 7, company: '', limit: 100 })
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [showFields, setShowFields] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadConfig()
      .then(cfg => {
        setConfig(cfg)
        if (cfg.tables?.length > 0) {
          setFilters(f => ({ ...f, tableId: cfg.tables[0].id }))
        }
      })
      .catch(() => navigate('/settings'))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % PHRASES.length), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getActiveTableName = () =>
    config?.tables?.find(t => t.id === filters.tableId)?.fullName || ''

  const getLastResult = () => {
    const last = [...messages].reverse().find(m => m.type === 'assistant' && m.data)
    return last?.data?.results || []
  }

  const getClientConfig = () => ({
    tableDoc:   localStorage.getItem('atom_table_doc')   || '',
    basePrompt: localStorage.getItem('atom_base_prompt') || ''
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
        filters: { table: getActiveTableName(), days: filters.days, company: filters.company, limit: filters.limit },
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
        filters: { table: getActiveTableName(), days: filters.days, company: filters.company, limit: filters.limit },
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
      { type: 'assistant', data: { analisis: item.analisis || [], recomendaciones: item.recomendaciones || [], followups: item.followups || [], results: item.raw_results || [], sql: item.sql_query, action: item.action }, question: item.question }
    ])
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen bg-[#fdf7f0]">
      <Header onHistoryClick={handleShowHistory} />

      <div className="h-14 shrink-0" />
      {config && <FilterBar filters={filters} onChange={setFilters} tables={config.tables || []} />}
      <div className="h-[60px] shrink-0" />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] max-w-3xl mx-auto w-full">
            <h1 key={phraseIdx} className="text-3xl font-bold text-gray-900 phrase-fade mb-8 text-center">
              {PHRASES[phraseIdx]}
            </h1>

            <div className="w-full relative">
              <ChatInput onSubmit={handleSend} disabled={loading} large />
              <button
                onClick={() => setShowFields(true)}
                className="absolute -bottom-7 right-0 flex items-center gap-1 text-xs text-gray-400 hover:text-accent transition-colors"
              >
                <HelpCircle size={12} />
                ver más
              </button>
            </div>

            <SuggestedActions onSelect={handleSend} />
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
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Trash2 size={12} className="inline mr-1" /> Limpiar conversación
            </button>
            <button
              onClick={() => setShowFields(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent transition-colors"
            >
              <HelpCircle size={12} />
              ver más
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
        <FieldsModal tableDoc={config?.tableDoc || ''} onClose={() => setShowFields(false)} />
      )}
    </div>
  )
}
