import { useEffect, useRef, useState, useMemo } from 'react'
import { useDebounce } from './hooks/useDebounce'
import PageHeader from './components/PageHeader'

type SessionSummary = {
  id: string
  count: number
  total_tokens: number
  total_cost: number
  avg_duration: number
  model_count: number
  models: string[]
  error_count: number
}

type TokenUsage = {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
}

type StoredRequest = {
  id: string
  session_id: string
  model: string
  method: string
  path: string
  request: string
  response: string
  usage: TokenUsage
  duration_ms: number
  status_code: number
  created_at: number
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString()
}

function tryPrettyJSON(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}

const statusColor = (code: number) => {
  if (code === 200) return 'bg-emerald-900/60 text-emerald-300'
  if (code >= 400) return 'bg-rose-900/60 text-rose-300'
  return 'bg-zinc-700 text-zinc-300'
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SortHeader = ({
  label,
  sortKey,
  currentKey,
  direction,
  onClick,
}: {
  label: string
  sortKey: string
  currentKey: string
  direction: 'asc' | 'desc'
  onClick: (key: string) => void
}) => {
  const isActive = currentKey === sortKey
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`font-medium transition-colors text-left ${isActive ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {label} {isActive ? (direction === 'asc' ? '↑' : '↓') : '↕'}
    </button>
  )
}

export default function SessionsList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessionReqs, setSessionReqs] = useState<StoredRequest[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null)
  const [modelFilter, setModelFilter] = useState('')
  const debouncedModel = useDebounce(modelFilter, 300)
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const fetchedRef = useRef(false)

  useEffect(() => {
    fetchedRef.current = true
    const params = new URLSearchParams()
    if (debouncedModel) params.set('model', debouncedModel)
    setLoading(true)
    fetch(`/api/sessions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data)
        setLoading(false)
        setSelectedId(null)
      })
      .catch(() => setLoading(false))
  }, [debouncedModel])

  const sortedSessions = useMemo(() => {
    if (!sortKey) return sessions
    return [...sessions].sort((a, b) => {
      const aVal = a[sortKey as keyof SessionSummary]
      const bVal = b[sortKey as keyof SessionSummary]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })
  }, [sessions, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const selectSession = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null)
      return
    }
    setSelectedId(id)
    setSessionLoading(true)
    setExpandedReqId(null)
    const params = new URLSearchParams({ limit: '50' })
    if (debouncedModel) params.set('model', debouncedModel)
    fetch(`/api/sessions/${encodeURIComponent(id)}/requests?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSessionReqs(data)
        setSessionLoading(false)
      })
      .catch(() => setSessionLoading(false))
  }

  const hasFilter = modelFilter !== ''
  const showInitialSkeleton = !fetchedRef.current || (loading && sessions.length === 0 && !hasFilter)

  const headerColumns = [
    { label: 'Session ID', sortKey: 'id' },
    { label: 'Requests', sortKey: 'count' },
    { label: 'Total Tokens', sortKey: 'total_tokens' },
    { label: 'Total Cost', sortKey: 'total_cost' },
    { label: 'Avg Duration', sortKey: 'avg_duration' },
    { label: 'Models', sortKey: 'model_count' },
    { label: 'Errors', sortKey: 'error_count' },
  ]

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="LLM request sessions grouped by ID"
        breadcrumbs={[{ label: 'Dashboard' }, { label: 'Sessions' }]}
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            placeholder="Filter by model..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
            autoFocus
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => setModelFilter('')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <ClearIcon />
            Clear
          </button>
        )}
      </div>

      {!showInitialSkeleton && (
        <div className="text-xs text-zinc-500 mb-3">
          {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''}
        </div>
      )}

      {showInitialSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sortedSessions.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <svg className="mx-auto mb-3 w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <p className="text-base">{hasFilter ? 'No matching sessions' : 'No sessions yet'}</p>
          <p className="text-sm mt-1 text-zinc-600">
            {hasFilter ? 'Try adjusting your filter.' : 'Requests with a session ID will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
              Refreshing...
            </div>
          )}

          {/* Header row */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 text-xs uppercase tracking-wider">
            {headerColumns.map((col) => (
              <div key={col.sortKey} className={col.sortKey === 'id' ? 'flex-1 min-w-0' : 'shrink-0 text-right w-24'}>
                <SortHeader
                  label={col.label}
                  sortKey={col.sortKey}
                  currentKey={sortKey}
                  direction={sortDir}
                  onClick={handleSort}
                />
              </div>
            ))}
          </div>

          {sortedSessions.map((s) => {
            const isOpen = selectedId === s.id
            return (
              <div key={s.id}>
                <div
                  className={`flex items-center gap-4 px-4 py-3 bg-zinc-900 rounded-lg cursor-pointer transition-all duration-150 hover:bg-zinc-800/60 border-l-2 ${isOpen ? 'border-cyan-500 bg-zinc-800/80' : 'border-transparent'}`}
                  onClick={() => selectSession(s.id)}
                >
                  <span className="font-mono text-sm text-indigo-400 flex-1 truncate min-w-0" title={s.id}>
                    {s.id}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums text-right w-24 shrink-0">{s.count}</span>
                  <span className="text-xs text-zinc-500 tabular-nums text-right w-24 shrink-0">{(s.total_tokens || 0).toLocaleString()}</span>
                  <span className="text-xs text-zinc-500 tabular-nums text-right w-24 shrink-0">${(s.total_cost || 0).toFixed(4)}</span>
                  <span className="text-xs text-zinc-500 tabular-nums text-right w-24 shrink-0">{Math.round(s.avg_duration || 0)}ms</span>
                  <span className="text-xs text-zinc-500 text-right w-24 shrink-0">{s.model_count} / {s.models?.length || 0}</span>
                  <span className={`text-xs text-right w-16 shrink-0 ${(s.error_count || 0) > 0 ? 'text-rose-400' : 'text-zinc-600'}`}>
                    {s.error_count || 0}
                  </span>
                  <svg
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {isOpen && (
                  <div className="bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-lg px-4 py-4 animate-slide-down">
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3 font-mono tabular-nums flex-wrap">
                      <span className="text-zinc-400 font-medium">{(s.total_tokens || 0).toLocaleString()} tokens</span>
                      <span>${(s.total_cost || 0).toFixed(4)}</span>
                      <span>{Math.round(s.avg_duration || 0)}ms avg</span>
                      <span>{s.models?.join(', ') || '—'}</span>
                      {(s.error_count || 0) > 0 && (
                        <span className="text-rose-400">{s.error_count} error{s.error_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {sessionLoading ? (
                      <div className="h-14 bg-zinc-800/50 rounded-lg animate-pulse" />
                    ) : (
                      <div className="space-y-1">
                        {sessionReqs.map((req) => {
                          const isReqExpanded = expandedReqId === req.id
                          return (
                            <div key={req.id}>
                              <div
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${isReqExpanded ? 'bg-zinc-800/80 border-l-2 border-cyan-500' : 'bg-black/30 hover:bg-zinc-800/40 border-l-2 border-transparent'}`}
                                onClick={() => setExpandedReqId(isReqExpanded ? null : req.id)}
                              >
                                <span className="font-mono text-xs text-cyan-400 w-20 truncate shrink-0">
                                  {req.id.slice(0, 12)}
                                </span>
                                <span className="flex-1 text-xs text-zinc-300 truncate min-w-0">{req.model}</span>
                                <span className="text-xs text-zinc-500 font-mono tabular-nums w-14 text-right shrink-0">{req.duration_ms}ms</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono shrink-0 ${statusColor(req.status_code)}`}>
                                  {req.status_code}
                                </span>
                                <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatTime(req.created_at)}</span>
                              </div>
                              {isReqExpanded && (
                                <div className="bg-black/20 border border-zinc-800 border-t-0 rounded-b-lg p-3 space-y-2 animate-slide-down">
                                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Request</span>
                                  <pre className="bg-black/40 border border-zinc-800 p-2.5 rounded-lg overflow-x-auto max-h-48 text-xs text-zinc-300 font-mono leading-relaxed">
                                    {tryPrettyJSON(req.request)}
                                  </pre>
                                  <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium block mt-2">Response</span>
                                  <pre className="bg-black/40 border border-zinc-800 p-2.5 rounded-lg overflow-x-auto max-h-48 text-xs text-zinc-300 font-mono leading-relaxed">
                                    {tryPrettyJSON(req.response)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
