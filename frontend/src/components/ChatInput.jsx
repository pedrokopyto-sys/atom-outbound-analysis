import { Send } from 'lucide-react'
import { useState } from 'react'

export default function ChatInput({ onSubmit, disabled, large = false }) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const q = value.trim()
    if (!q || disabled) return
    onSubmit(q)
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={`input-glow flex items-end gap-3 bg-white border border-gray-200 rounded-2xl transition-all ${large ? 'p-4 shadow-md shadow-orange-100/60' : 'p-3'}`}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Preguntame algo sobre tus campañas..."
        rows={large ? 2 : 1}
        className={`flex-1 bg-transparent text-gray-800 placeholder-gray-400 resize-none focus:outline-none ${large ? 'text-base' : 'text-sm'}`}
        style={{ minHeight: large ? '48px' : '24px', maxHeight: '120px', height: 'auto' }}
        onInput={e => {
          e.target.style.height = 'auto'
          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className={`rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 ${large ? 'p-3' : 'p-2'}`}
      >
        <Send size={large ? 16 : 14} className="text-white" />
      </button>
    </div>
  )
}
