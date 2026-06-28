import { useEffect, useState } from 'react'
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from './components/PageHeader'
import StatsCard from './components/StatsCard'

const CHART_COLORS = ['#f43f5e', '#f97316', '#eab308', '#a855f7', '#06b6d4', '#10b981']

type StoredRequest = { id: string; model: string; status_code: number; duration_ms: number; created_at: number; error_type?: string; error_message?: string; request: string; response: string }
type TimeseriesPoint = { timestamp: number; errors: number }

function formatTime(ts: number) { return new Date(ts).toLocaleString() }

const statusColor = (code: number) => {
  if (code === 429) return 'bg-amber-900/60 text-amber-300'
  if (code >= 500) return 'bg-rose-900/60 text-rose-300'
  return 'bg-zinc-700 text-zinc-300'
}

export default function ErrorAnalysis() {
  const [stats, setStats] = useState<any>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [errors, setErrors] = useState<StoredRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/stats/timeseries?granularity=hour').then(r => r.json()),
      fetch('/api/requests?status_code=400&status_code=429&status_code=500&limit=20').then(r => r.json()),
    ]).then(([s, ts, e]) => {
      setStats(s)
      setTimeseries(ts.points || [])
      setErrors(e || [])
      setLoading(false)
    }).catch(() => { setError(true); setLoading(false) })
  }, [retryCount])

  const errorRate = stats?.error_rate || 0
  const errorCounts: Record<string, number> = stats?.error_counts || {}
  const errorTypes = Object.keys(errorCounts).length
  const totalErrors = Object.values(errorCounts).reduce((a: number, b: any) => a + (b as number), 0)
  const errorColor = errorRate < 0.05 ? 'border-emerald-500' : errorRate < 0.10 ? 'border-amber-500' : 'border-rose-500'

  const pieData = Object.entries(errorCounts).map(([name, value]) => ({ name, value }))

  if (error) {
    return (
      <div>
        <PageHeader title="Error Analysis" description="Error rates, types, and drill-down" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Errors' }]} />
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
      <PageHeader title="Error Analysis" description="Error rates, types, and drill-down" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Errors' }]} />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Error Rate" value={loading ? '—' : `${(errorRate * 100).toFixed(1)}%`} accentColor={errorColor} loading={loading} />
        <StatsCard title="Total Errors" value={loading ? '—' : totalErrors.toLocaleString()} loading={loading} />
        <StatsCard title="Error Types" value={loading ? '—' : errorTypes.toString()} loading={loading} />
      </div>

      {/* Error timeline */}
      <div className="bg-zinc-900 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">Error Rate Timeline (24h)</h3>
        {timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit' })} stroke="#52525b" fontSize={11} />
              <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }} labelFormatter={(ts: any) => typeof ts === 'number' ? new Date(ts).toLocaleString() : String(ts)} />
              <Area type="monotone" dataKey="errors" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} strokeWidth={2} name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">No data</div>
        )}
      </div>

      {/* Error types distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Error Type Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No errors</div>
          )}
        </div>
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Errors by Type</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} />
                <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No errors</div>
          )}
        </div>
      </div>

      {/* Recent errors table */}
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Recent Errors</h3>
      {loading ? (
        <div className="bg-zinc-900 rounded-xl p-5 space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : errors.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl text-center py-12 text-zinc-500"><p>No errors found</p></div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="space-y-0">
            {errors.map(err => {
              const isExpanded = expandedId === err.id
              return (
                <div key={err.id}>
                  <div onClick={() => setExpandedId(isExpanded ? null : err.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-l-2 ${isExpanded ? 'bg-zinc-800/80 border-rose-500' : 'hover:bg-zinc-800/30 border-transparent'}`}>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono ${statusColor(err.status_code)}`}>{err.status_code}</span>
                    <span className="font-mono text-xs text-rose-400 w-20 truncate">{err.id.slice(0, 12)}</span>
                    <span className="flex-1 text-sm text-zinc-300 truncate">{err.model}</span>
                    <span className="text-xs text-zinc-500 font-mono w-16 text-right">{err.duration_ms}ms</span>
                    <span className="text-xs text-zinc-600">{formatTime(err.created_at)}</span>
                  </div>
                  {isExpanded && (
                    <div className="bg-black/20 border-t border-zinc-800 px-4 py-3 space-y-2 animate-slide-down">
                      {err.error_type && <p className="text-xs text-rose-400">Type: {err.error_type}</p>}
                      {err.error_message && <p className="text-xs text-zinc-400">Message: {err.error_message}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
