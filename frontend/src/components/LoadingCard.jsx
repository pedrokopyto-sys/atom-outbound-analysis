import { useEffect, useState } from 'react'

const MESSAGES = [
  'Analizando tus campañas...',
  'Generando consulta SQL...',
  'Ejecutando en BigQuery...',
  'Generando insights...',
  'Procesando resultados...'
]

export default function LoadingCard() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MESSAGES.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-accent rounded-full thinking-dot" />
        <div className="w-1.5 h-1.5 bg-accent rounded-full thinking-dot" />
        <div className="w-1.5 h-1.5 bg-accent rounded-full thinking-dot" />
      </div>
      <span className="text-sm text-gray-500">{MESSAGES[idx]}</span>
    </div>
  )
}
