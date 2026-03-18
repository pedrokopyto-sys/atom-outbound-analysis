import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function SqlModal({ sql, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Query ejecutada</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white font-medium transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto max-h-[65vh]">
          <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap leading-relaxed">{sql}</pre>
        </div>
      </div>
    </div>
  )
}
