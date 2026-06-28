import { useEffect, useState } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import StatsCard from './components/StatsCard'
import PageHeader from './components/PageHeader'

type PerModelStat = { model: string; requests: number; tokens: number; cost_usd: number; error_rate: number }
type TimeseriesPoint = { timestamp: number; requests: number; tokens: number; cost_usd: number; errors: number }

type Stats = {
  daily_cost: number; total_cost: number; total_requests: number; total_tokens: number
  per_model: PerModelStat[]; error_rate: number; error_counts: Record<string, number>
  avg_latency_ms: number; p50_latency: number; p95_latency: number; p99_latency: number
}

const CHART_COLORS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#6366f1', '#14b8a6', '#e11d48']

const timeRanges = [
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
  { label: '90d', hours: 2160 },
]

function formatTime(ts: number) { return new Date(ts).toLocaleString() }
function formatHour(ts: number) { return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }) }
function fmtCost(n: number) { return `$${n.toFixed(4)}` }
function fmtNum(n: number) { return n.toLocaleString() }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{formatTime(label)}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</p>
      ))}
    </div>
  )
}

export default function CostDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [timeRange, setTimeRange] = useState(168)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(false)
    const from = Date.now() - timeRange * 3600 * 1000
    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch(`/api/stats/timeseries?granularity=hour&from=${from}`).then(r => r.json()),
    ])
      .then(([statsData, tsData]) => {
        setStats(statsData)
        setTimeseries(tsData.points || [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [timeRange, retryCount])

  const modelCostData = stats?.per_model?.map(m => ({ name: m.model, value: m.cost_usd })) || []
  const modelTokenData = stats?.per_model?.map(m => ({ name: m.model, tokens: m.tokens })) || []

  return (
    <div>
      <PageHeader title="Cost Dashboard" description="Usage and cost analytics" breadcrumbs={[{ label: 'Dashboard' }, { label: 'Cost' }]}
        actions={
          <div className="flex gap-1">
            {timeRanges.map(tr => (
              <button key={tr.label} onClick={() => setTimeRange(tr.hours)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${timeRange === tr.hours ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-transparent'}`}>
                {tr.label}
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base">Failed to load data</p>
          <button onClick={() => { setError(false); setRetryCount(c => c + 1) }}
            className="mt-3 text-sm text-cyan-400 hover:text-cyan-300">Retry</button>
        </div>
      ) : (
        <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Daily Cost" value={loading ? '—' : fmtCost(stats?.daily_cost || 0)} loading={loading} />
        <StatsCard title="Total Cost" value={loading ? '—' : fmtCost(stats?.total_cost || 0)} loading={loading} />
        <StatsCard title="Total Requests" value={loading ? '—' : fmtNum(stats?.total_requests || 0)} loading={loading} />
        <StatsCard title="Total Tokens" value={loading ? '—' : fmtNum(stats?.total_tokens || 0)} loading={loading} />
      </div>

      {/* Cost trend chart */}
      <div className="bg-zinc-900 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">Daily Cost Trend</h3>
        {timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="timestamp" tickFormatter={formatHour} stroke="#52525b" fontSize={11} />
              <YAxis stroke="#52525b" fontSize={11} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="cost_usd" stroke="#06b6d4" strokeWidth={2} dot={false} name="Cost" />
            </LineChart>
          </ResponsiveContainer>
        ) : loading ? (
          <div className="h-[250px] bg-zinc-800/50 rounded-lg animate-pulse flex items-center justify-center" />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No data</div>
        )}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Cost by Model</h3>
          {modelCostData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={modelCostData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(entry: { name?: string; percent?: number }) => `${entry.name ?? ''} ${((entry.percent ?? 0) * 100).toFixed(0)}%`}>
                  {modelCostData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No data</div>
          )}
        </div>
        <div className="bg-zinc-900 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Tokens by Model</h3>
          {modelTokenData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={modelTokenData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#52525b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#52525b" fontSize={11} width={90} />
                <Tooltip />
                <Bar dataKey="tokens" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-zinc-600 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Per-model table */}
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Per-Model Breakdown</h3>
      {stats?.per_model && stats.per_model.length > 0 ? (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Model</th>
                <th className="text-right px-4 py-3 font-medium">Requests</th>
                <th className="text-right px-4 py-3 font-medium">Tokens</th>
                <th className="text-right px-4 py-3 font-medium">Cost</th>
                <th className="text-right px-4 py-3 font-medium">Err Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.per_model.map(m => (
                <tr key={m.model} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-200">{m.model}</td>
                  <td className="px-4 py-3 text-right text-zinc-400 font-mono">{fmtNum(m.requests)}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono">{fmtNum(m.tokens)}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono">{fmtCost(m.cost_usd)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={m.error_rate > 0.1 ? 'text-rose-400' : m.error_rate > 0.05 ? 'text-amber-400' : 'text-zinc-400'}>
                      {(m.error_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl text-center py-12 text-zinc-500">
          <p>No model data yet</p>
        </div>
      )}
        </>
      )}
    </div>
  )
}
