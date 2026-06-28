import { ReactNode } from 'react'

type StatsCardProps = {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; isUp: boolean }
  accentColor?: string
  loading?: boolean
}

export default function StatsCard({ title, value, icon, trend, accentColor = 'border-cyan-500', loading }: StatsCardProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-5 border-l-2 border-zinc-700">
        <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-3" />
        <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
      </div>
    )
  }
  return (
    <div className={`bg-zinc-900 rounded-xl p-5 border-l-2 ${accentColor} relative overflow-hidden`}>
      {icon && <div className="absolute top-3 right-3 text-zinc-600">{icon}</div>}
      <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent tabular-nums">
          {value}
        </p>
        {trend && (
          <span className={`text-xs font-medium ${trend.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  )
}
