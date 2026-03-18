import { X, BookOpen } from 'lucide-react'

export default function FieldsModal({ tableDoc, onClose }) {
  const lines = (tableDoc || '').split('\n')
  const tableLines = lines.filter(l => l.trim().startsWith('|'))
  const hasMarkdownTable = tableLines.length > 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-accent" />
            <span className="text-sm font-semibold text-gray-800">Campos disponibles</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[65vh] p-5">
          {!tableDoc ? (
            <p className="text-sm text-gray-400">
              No hay documentación cargada.{' '}
              <a href="/settings" className="text-accent font-semibold underline">Ir a Configuración</a> para agregar la descripción de los campos.
            </p>
          ) : hasMarkdownTable ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {tableLines.map((line, i) => {
                    const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
                    const isSeparator = cells.every(c => /^[-:\s]+$/.test(c))
                    if (isSeparator) return null
                    const isHeader = i === 0
                    return (
                      <tr key={i} className={`border-b border-gray-100 ${isHeader ? 'bg-orange-50' : 'hover:bg-orange-50/50'}`}>
                        {cells.map((cell, j) => isHeader
                          ? <th key={j} className="px-3 py-2 text-left text-xs font-bold text-accent whitespace-nowrap">{cell.trim()}</th>
                          : <td key={j} className="px-3 py-2 text-gray-700">{cell.trim()}</td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{tableDoc}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
