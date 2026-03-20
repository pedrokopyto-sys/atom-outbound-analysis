const SUGGESTIONS_OUTBOUND = [
  { emoji: '🏆', label: '¿Cuáles son las campañas con mejor rendimiento?' },
  { emoji: '✍️', label: '¿Cómo están los textos de los templates? ¿Cuáles convierten mejor?' },
  { emoji: '❌', label: '¿Qué campañas tienen mayor tasa de fallos o errores de entrega?' },
]

const SUGGESTIONS_INBOUND = [
  { emoji: '❓', label: '¿Cuáles son las principales preguntas de los clientes?' },
  { emoji: '🤖', label: '¿Cuáles son las fricciones más grandes con el bot?' },
  { emoji: '👤', label: '¿Cuáles son las oportunidades de mejora para los asesores humanos?' },
]

export default function SuggestedActions({ onSelect, tableId }) {
  const suggestions = tableId === 'first_30_messages_last_30_days'
    ? SUGGESTIONS_INBOUND
    : SUGGESTIONS_OUTBOUND

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      {suggestions.map(({ emoji, label }, i) => (
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
