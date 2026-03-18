import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const MAX_BARS = 5

function detectAxes(rows) {
  if (!rows || rows.length === 0) return null
  const keys = Object.keys(rows[0])
  const numericKeys = keys.filter(k =>
    rows.slice(0, 10).some(r => r[k] != null && !isNaN(Number(r[k])) && r[k] !== '')
  )
  const categoryKeys = keys.filter(k => !numericKeys.includes(k))
  if (categoryKeys.length > 0 && numericKeys.length > 0) {
    return { xKey: categoryKeys[0], yKey: numericKeys[0] }
  }
  return null
}

const ORANGE_SHADES = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

export default function ChartView({ rows, chartType }) {
  if (!rows || rows.length < 2 || chartType === 'none') return null
  const axes = detectAxes(rows)
  if (!axes) return null

  const truncated = rows.length > MAX_BARS

  // Sort by yKey desc and take top 5
  const data = [...rows]
    .sort((a, b) => Number(b[axes.yKey]) - Number(a[axes.yKey]))
    .slice(0, MAX_BARS)
    .map(r => ({ ...r, [axes.yKey]: Number(r[axes.yKey]) }))

  const tickStyle = { fill: '#9ca3af', fontSize: 11 }

  // Dynamic left margin based on longest label
  const maxLabelLen = Math.max(...data.map(r => String(r[axes.xKey] ?? '').length))
  const leftMargin = Math.min(Math.max(maxLabelLen * 6, 80), 220)

  return (
    <div className="space-y-1">
      <div style={{ height: `${Math.max(data.length * 52 + 20, 120)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 24, bottom: 4, left: leftMargin }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
            <XAxis
              type="number"
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            />
            <YAxis
              type="category"
              dataKey={axes.xKey}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={leftMargin}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e1e1e',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 10,
                fontSize: 12
              }}
              labelStyle={{ color: '#e5e5e5' }}
              itemStyle={{ color: '#f97316' }}
            />
            <Bar dataKey={axes.yKey} radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={ORANGE_SHADES[i % ORANGE_SHADES.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {truncated && (
        <p className="text-xs text-gray-400 text-right">
          * Solo se muestran los {MAX_BARS} principales resultados
        </p>
      )}
    </div>
  )
}
