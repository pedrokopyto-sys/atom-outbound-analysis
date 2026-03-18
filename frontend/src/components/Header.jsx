import { Settings, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Header({ onHistoryClick }) {
  const [imgError, setImgError] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14 border-b border-orange-100 bg-[#fdf7f0]/95 backdrop-blur">
      <div className="flex items-center">
        {!imgError ? (
          <img
            src="/logo.png"
            alt="ATOM"
            className="h-8 w-auto"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">ATOM</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onHistoryClick}
          className="p-2 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors"
          title="Historial"
        >
          <Clock size={16} />
        </button>
        <Link
          to="/settings"
          className="p-2 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors"
          title="Configuración"
        >
          <Settings size={16} />
        </Link>
      </div>
    </header>
  )
}
