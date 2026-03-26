import { X, BookOpen } from 'lucide-react'

export default function FieldsModal({ tableDescription, onClose }) {
  const { description = '', columns = [] } = tableDescription || {}
  const hasData = description || columns.length > 0

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
            <span className="text-sm font-semibold text-gray-800">Documentación de tabla</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[65vh] p-5 space-y-4">
          {!hasData ? (
            <p className="text-sm text-gray-400">
              No hay documentación cargada.{' '}
              <a href="/settings" className="text-accent font-semibold underline">Ir a Configuración</a> para agregar la descripción de los campos.
            </p>
          ) : (
            <>
              {description && (
                <p className="text-sm text-gray-600 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 leading-relaxed">
                  {description}
                </p>
              )}
              {columns.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-orange-50 border-b border-orange-100">
                        <th className="px-3 py-2 text-left font-bold text-accent whitespace-nowrap">Campo</th>
                        <th className="px-3 py-2 text-left font-bold text-accent whitespace-nowrap">Tipo</th>
                        <th className="px-3 py-2 text-left font-bold text-accent">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/40">
                          <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{col.name}</td>
                          <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{col.type}</td>
                          <td className="px-3 py-2 text-gray-500">{col.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
