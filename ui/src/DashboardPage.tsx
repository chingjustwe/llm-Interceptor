import { useEffect, useState } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatsCard from './components/StatsCard'
import PageHeader from './components/PageHeader'

type Stats = {
  daily_cost: number
  total_cost: number
  total_requests: number
  total_tokens: number
  avg_latency_ms: number
  p50_latency: number
  p95_latency: number
  p99_latency: number
  error_rate: number
  error_counts: Record<string, number>
  per_model: any[]
}

type TimeseriesPoint = {
  timestamp: number
  requests: number
  tokens: number
  cost_usd: number
  errors: number
}

type StoredRequest = {
  id: string
  model: string
  status_code: number
  duration_ms: number
  error_type?: string
  created_at: number
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString()
}

function formatHour(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [recentErrors, setRecentErrors] = useState<StoredRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/stats/timeseries?granularity=hour').then(r => r.json()),
      fetch('/api/requests?status_code=400&status_code=429&status_code=500&limit=10').then(r => r.json()),
    ])
      .then(([statsData, tsData, errorsData]) => {
        setStats(statsData)
        setTimeseries(tsData.points || [])
        setRecentErrors(errorsData || [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [retryCount])

  const errorRateColor = stats
    ? stats.error_rate < 0.05 ? 'border-emerald-500'
      : stats.error_rate < 0.10 ? 'border-amber-500'
      : 'border-rose-500'
    : 'border-zinc-700'

  const qps = stats ? (stats.total_requests / 86400).toFixed(2) : '—'

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Real-time LLM gateway overview" breadcrumbs={[{ label: 'Dashboard' }]} />
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base">Failed to load data</p>
          <button onClick={() => { setError(false); setRetryCount(c => c + 1) }}
            className="mt-3 text-sm text-cyan-400 hover:text-cyan-300">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Real-time LLM gateway overview" breadcrumbs={[{ label: 'Dashboard' }]} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="QPS" value={loading ? '—' : `${qps}/s`} loading={loading} />
        <StatsCard title="Error Rate" value={loading ? '—' : `${((stats?.error_rate || 0) * 100).toFixed(1)}%`} accentColor={errorRateColor} loading={loading} />
        <StatsCard title="Avg Latency" value={loading ? '—' : `${Math.round(stats?.avg_latency_ms || 0)} ms`} loading={loading} />
        <StatsCard title="Daily Cost" value={loading ? '—' : fmtCost(stats?.daily_cost || 0)} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Cost Trend (24h)</h3>
          {timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="timestamp" tickFormatter={formatHour} stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(ts: any) => formatTime(ts)}
                  formatter={(value: any) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                />
                <Line type="monotone" dataKey="cost_usd" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">No data</div>
          )}
        </div>
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Errors (24h)</h3>
          {timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="timestamp" tickFormatter={formatHour} stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(ts: any) => formatTime(ts)}
                />
                <Area type="monotone" dataKey="errors" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">No data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Recent Errors</h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />)}
            </div>
          ) : recentErrors.length > 0 ? (
            <div className="space-y-1">
              {recentErrors.map((req) => (
                <div key={req.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30 text-xs">
                  <span className="text-rose-400 font-mono">{req.status_code}</span>
                  <span className="text-zinc-300 truncate flex-1">{req.model}</span>
                  <span className="text-zinc-500">{req.duration_ms}ms</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-8">No recent errors</p>
          )}
        </div>
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Active Sessions</h3>
          {loading ? (
            <div className="h-8 bg-zinc-800 rounded animate-pulse w-24" />
          ) : (
            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{stats?.total_requests || '—'}</p>
          )}
          <p className="text-xs text-zinc-500 mt-1">Total requests processed</p>
        </div>
      </div>
    </div>
  )
}
