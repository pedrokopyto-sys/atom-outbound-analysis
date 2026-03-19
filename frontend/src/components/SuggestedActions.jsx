const SUGGESTIONS = [
  { emoji: '🏆', label: '¿Cuáles son las campañas con mejor rendimiento?' },
  { emoji: '✍️', label: '¿Cómo están los textos de los templates? ¿Cuáles convierten mejor?' },
  { emoji: '❌', label: '¿Qué campañas tienen mayor tasa de fallos o errores de entrega?' },
]

export default function SuggestedActions({ onSelect }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      {SUGGESTIONS.map(({ emoji, label }, i) => (
        <button
          key={i}
          onClick={() => onSelect(label)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 hover:bg-accent text-white text-xs font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <span>{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
