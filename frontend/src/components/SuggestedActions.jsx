import { BarChart2, TrendingDown, Trophy, CalendarDays } from 'lucide-react'

const SUGGESTIONS = [
  { icon: BarChart2,    label: 'Mejor rendimiento' },
  { icon: TrendingDown, label: 'Mayor tasa de error' },
  { icon: Trophy,       label: 'Templates top' },
  { icon: CalendarDays, label: 'Envíos por día' }
]

export default function SuggestedActions({ onSelect }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {SUGGESTIONS.map(({ icon: Icon, label }, i) => (
        <button
          key={i}
          onClick={() => onSelect(label)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 hover:bg-accent text-white text-sm font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
