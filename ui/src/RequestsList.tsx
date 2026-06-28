import { useEffect, useRef, useState } from 'react'
import { useDebounce } from './hooks/useDebounce'
import PageHeader from './components/PageHeader'
import FilterBar from './components/FilterBar'

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
  system_prompt?: string
  stop_reason?: string
  error_type?: string
  error_message?: string
  ttft_ms?: number
  temperature?: number
  top_p?: number
  request_params?: string
}

const statusColor = (code: number) => {
  if (code === 200) return 'bg-emerald-900/60 text-emerald-300'
  if (code === 429) return 'bg-amber-900/60 text-amber-300'
  if (code >= 400) return 'bg-rose-900/60 text-rose-300'
  return 'bg-zinc-700 text-zinc-300'
}

const ALL_COLUMNS = ['id', 'model', 'session', 'duration', 'status', 'tokens', 'time', 'stop_reason', 'error_type'] as const
const DEFAULT_COLUMNS = ['id', 'model', 'session', 'duration', 'status', 'tokens', 'time', 'stop_reason', 'error_type']
const STATUS_RANGES = [
  { label: '2xx', codes: [200, 201, 204] },
  { label: '3xx', codes: [301, 302, 304] },
  { label: '4xx', codes: [400, 401, 403, 404, 429] },
  { label: '5xx', codes: [500, 502, 503, 504] },
]
const STATUS_CODES = STATUS_RANGES.flatMap(r => r.codes)

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  model: 'Model',
  session: 'Session',
  duration: 'Duration',
  status: 'Status',
  tokens: 'Tokens',
  time: 'Time',
  stop_reason: 'Stop Reason',
  error_type: 'Error Type',
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

export default function RequestsList() {
  const [requests, setRequests] = useState<StoredRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const [availableStopReasons, setAvailableStopReasons] = useState<string[]>([])
  const [availableErrorTypes, setAvailableErrorTypes] = useState<string[]>([])

  // Fetch available filter options on mount (unfiltered), so dropdowns show only values that exist in DB
  useEffect(() => {
    fetch('/api/requests?limit=500')
      .then(r => r.json())
      .then((data: StoredRequest[]) => {
        const reasons = new Set<string>()
        const errors = new Set<string>()
        for (const r of data) {
          if (r.stop_reason) reasons.add(r.stop_reason)
          if (r.error_type) errors.add(r.error_type)
        }
        setAvailableStopReasons([...reasons].sort())
        setAvailableErrorTypes([...errors].sort())
      })
      .catch(() => {})
  }, [])

  const [modelFilter, setModelFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [stopReasonFilter, setStopReasonFilter] = useState('')
  const [errorTypeFilter, setErrorTypeFilter] = useState('')
  const [statusCodesFilter, setStatusCodesFilter] = useState<number[]>([])
  const [minDuration, setMinDuration] = useState('')
  const [maxDuration, setMaxDuration] = useState('')

  const debouncedModel = useDebounce(modelFilter, 300)
  const debouncedSession = useDebounce(sessionFilter, 300)
  const debouncedMinDuration = useDebounce(minDuration, 300)
  const debouncedMaxDuration = useDebounce(maxDuration, 300)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('req-columns')
      return saved ? JSON.parse(saved) : [...DEFAULT_COLUMNS]
    } catch {
      return [...DEFAULT_COLUMNS]
    }
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  const fetchedRef = useRef(false)
  const columnMenuRef = useRef<HTMLDivElement>(null)

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
      localStorage.setItem('req-columns', JSON.stringify(next))
      return next
    })
  }

  const toggleStatusCodeRange = (rangeCodes: number[]) => {
    setStatusCodesFilter((prev) => {
      const activeCodes = rangeCodes.filter(c => prev.includes(c))
      if (activeCodes.length === rangeCodes.length) {
        // All codes in range are active → remove all
        return prev.filter(c => !rangeCodes.includes(c))
      } else {
        // Add all codes in range that aren't active yet
        const toAdd = rangeCodes.filter(c => !prev.includes(c))
        return [...prev, ...toAdd]
      }
    })
  }

  useEffect(() => {
    fetchedRef.current = true
    setError(null)
    const params = new URLSearchParams({ limit: '50' })
    if (debouncedModel) params.set('model', debouncedModel)
    if (debouncedSession) params.set('session_id', debouncedSession)
    if (stopReasonFilter) params.set('stop_reason', stopReasonFilter)
    if (errorTypeFilter) params.set('error_type', errorTypeFilter)
    if (statusCodesFilter.length > 0) statusCodesFilter.forEach(code => params.append('status_code', code.toString()))
    if (debouncedMinDuration) params.set('min_duration', debouncedMinDuration)
    if (debouncedMaxDuration) params.set('max_duration', debouncedMaxDuration)

    setLoading(true)
    fetch(`/api/requests?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setRequests(data)
        setLoading(false)
        setExpandedId(null)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [debouncedModel, debouncedSession, stopReasonFilter, errorTypeFilter, statusCodesFilter, debouncedMinDuration, debouncedMaxDuration, retryCount])

  useEffect(() => {
    if (!showColumnMenu) return
    const handleClick = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColumnMenu])

  const clearFilters = () => {
    setModelFilter('')
    setSessionFilter('')
    setStopReasonFilter('')
    setErrorTypeFilter('')
    setStatusCodesFilter([])
    setMinDuration('')
    setMaxDuration('')
  }

  const hasFilter =
    modelFilter !== '' ||
    sessionFilter !== '' ||
    stopReasonFilter !== '' ||
    errorTypeFilter !== '' ||
    statusCodesFilter.length > 0 ||
    minDuration !== '' ||
    maxDuration !== ''

  const exportParams = () => {
    const params = new URLSearchParams()
    if (modelFilter) params.set('model', modelFilter)
    if (sessionFilter) params.set('session_id', sessionFilter)
    if (stopReasonFilter) params.set('stop_reason', stopReasonFilter)
    if (errorTypeFilter) params.set('error_type', errorTypeFilter)
    if (statusCodesFilter.length > 0) statusCodesFilter.forEach(code => params.append('status_code', code.toString()))
    if (minDuration) params.set('min_duration', minDuration)
    if (maxDuration) params.set('max_duration', maxDuration)
    return params.toString()
  }

  const showInitialSkeleton = !fetchedRef.current || (loading && requests.length === 0 && !hasFilter)
  const isColVisible = (col: string) => visibleColumns.includes(col)

  const textFilters = [
    { key: 'model', label: 'Model', value: modelFilter, onChange: setModelFilter, placeholder: 'Filter by model...' },
    { key: 'session', label: 'Session', value: sessionFilter, onChange: setSessionFilter, placeholder: 'Filter by session...' },
    { key: 'min_duration', label: 'Min Duration', value: minDuration, onChange: setMinDuration, placeholder: 'Min duration (ms)...' },
    { key: 'max_duration', label: 'Max Duration', value: maxDuration, onChange: setMaxDuration, placeholder: 'Max duration (ms)...' },
  ]

  return (
    <div>
      <PageHeader
        title="Requests"
        description="Browse and inspect LLM requests"
        breadcrumbs={[
          { label: 'Dashboard' },
          { label: 'Requests' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/requests/export?${exportParams()}&format=csv`}
              download
              className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              CSV
            </a>
            <a
              href={`/api/requests/export?${exportParams()}&format=json`}
              download
              className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              JSON
            </a>
            <div className="relative" ref={columnMenuRef}>
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Columns
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 shadow-xl z-20 min-w-[140px]">
                  {ALL_COLUMNS.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col)}
                        onChange={() => toggleColumn(col)}
                        className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
                      />
                      {COLUMN_LABELS[col] || col}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      <FilterBar filters={textFilters} onClear={clearFilters} />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
          <select
            value={stopReasonFilter}
            onChange={(e) => setStopReasonFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          >
            <option value="">All stop reasons</option>
            {availableStopReasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={errorTypeFilter}
            onChange={(e) => setErrorTypeFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          >
            <option value="">All error types</option>
            {availableErrorTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

        <div className="flex items-center gap-1.5">
          {STATUS_RANGES.map((range) => {
            const allActive = range.codes.every(c => statusCodesFilter.includes(c))
            const someActive = range.codes.some(c => statusCodesFilter.includes(c))
            return (
              <button
                key={range.label}
                onClick={() => toggleStatusCodeRange(range.codes)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                  allActive
                    ? 'bg-cyan-900/60 text-cyan-300'
                    : someActive
                    ? 'bg-amber-900/60 text-amber-300'
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                }`}
              >
                {range.label}
              </button>
            )
          })}
          {statusCodesFilter.length > 0 && (
            <span className="text-[10px] text-zinc-600 ml-1">({statusCodesFilter.length} codes)</span>
          )}
        </div>
      </div>

      {!showInitialSkeleton && !error && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-full font-mono">
            {requests.length} result{requests.length !== 1 ? 's' : ''}
          </span>
          {loading && hasFilter && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
              Refreshing...
            </span>
          )}
        </div>
      )}

      {showInitialSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20 text-zinc-500">
          <svg className="mx-auto mb-3 w-10 h-10 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-base text-rose-400">Failed to load requests</p>
          <p className="text-sm mt-1 text-zinc-600">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-4 text-xs text-cyan-400 hover:text-cyan-300 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 && !loading ? (
        <div className="text-center py-20 text-zinc-500">
          <svg className="mx-auto mb-3 w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <p className="text-base">{hasFilter ? 'No matching requests' : 'No requests yet'}</p>
          {hasFilter ? (
            <div className="text-sm mt-2 space-y-1">
              <p className="text-zinc-600">Active filters:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                {modelFilter && <span className="bg-zinc-800 px-2 py-0.5 rounded">model: {modelFilter}</span>}
                {sessionFilter && <span className="bg-zinc-800 px-2 py-0.5 rounded">session: {sessionFilter}</span>}
                {stopReasonFilter && <span className="bg-zinc-800 px-2 py-0.5 rounded">stop: {stopReasonFilter}</span>}
                {errorTypeFilter && <span className="bg-zinc-800 px-2 py-0.5 rounded">error: {errorTypeFilter}</span>}
                {statusCodesFilter.length > 0 && <span className="bg-zinc-800 px-2 py-0.5 rounded">status: {statusCodesFilter.join(',')}</span>}
              </div>
              <p className="text-zinc-600 mt-2">Try adjusting or clearing filters.</p>
            </div>
          ) : (
            <p className="text-sm mt-1 text-zinc-600">
              Send an LLM request through the proxy to see it here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
              Refreshing...
            </div>
          )}

          {/* Column headers */}
          {requests.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 text-[11px] text-zinc-500 uppercase tracking-wider font-medium border-b border-zinc-800 mb-1">
              {isColVisible('id') && <span className="w-20 shrink-0">ID</span>}
              {isColVisible('model') && <span className="flex-1 min-w-0">Model</span>}
              {isColVisible('session') && <span className="w-20 shrink-0">Session</span>}
              {isColVisible('duration') && <span className="w-16 text-right shrink-0">Duration</span>}
              {isColVisible('status') && <span className="shrink-0">Status</span>}
              {isColVisible('tokens') && <span className="w-16 text-right shrink-0">Tokens</span>}
              {isColVisible('time') && <span className="shrink-0">Time</span>}
              {isColVisible('stop_reason') && <span className="shrink-0 max-w-[80px]">Stop</span>}
              {isColVisible('error_type') && <span className="shrink-0 max-w-[80px]">Error</span>}
            </div>
          )}

          {requests.map((req) => {
            const isExpanded = expandedId === req.id
            return (
              <div key={req.id}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-lg cursor-pointer transition-all duration-150 hover:bg-zinc-800/60 border-l-2 ${isExpanded ? 'border-cyan-500 bg-zinc-800/80' : 'border-transparent'}`}
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  {isColVisible('id') && (
                    <span className="font-mono text-xs text-cyan-400 w-20 truncate shrink-0" title={req.id}>
                      {req.id.slice(0, 12)}
                    </span>
                  )}
                  {isColVisible('model') && (
                    <span className="flex-1 text-sm text-zinc-200 truncate min-w-0">{req.model}</span>
                  )}
                  {isColVisible('session') && (
                    <span className="font-mono text-xs text-zinc-500 w-20 truncate shrink-0" title={req.session_id}>
                      {req.session_id.slice(0, 12)}
                    </span>
                  )}
                  {isColVisible('duration') && (
                    <span className="text-xs text-zinc-500 font-mono tabular-nums w-16 text-right shrink-0">{req.duration_ms}ms</span>
                  )}
                  {isColVisible('status') && (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono shrink-0 ${statusColor(req.status_code)}`}>
                      {req.status_code}
                    </span>
                  )}
                  {isColVisible('tokens') && (
                    <span className="text-xs text-zinc-600 font-mono tabular-nums w-16 text-right shrink-0">
                      {req.usage.input_tokens + req.usage.output_tokens}
                    </span>
                  )}
                  {isColVisible('time') && (
                    <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatTime(req.created_at)}</span>
                  )}
                  {isColVisible('stop_reason') && req.stop_reason && (
                    <span className="text-xs text-zinc-400 font-mono truncate shrink-0 max-w-[80px]">{req.stop_reason}</span>
                  )}
                  {isColVisible('error_type') && req.error_type && (
                    <span className="text-xs text-rose-400 font-mono truncate shrink-0 max-w-[80px]">{req.error_type}</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-lg px-4 py-4 space-y-3 animate-slide-down">
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap">
                      <span>input <span className="text-zinc-300">{req.usage.input_tokens}</span></span>
                      <span>output <span className="text-zinc-300">{req.usage.output_tokens}</span></span>
                      {req.usage.cache_read_tokens > 0 && (
                        <span>cache_read <span className="text-zinc-300">{req.usage.cache_read_tokens}</span></span>
                      )}
                      {req.usage.cache_creation_tokens > 0 && (
                        <span>cache_create <span className="text-zinc-300">{req.usage.cache_creation_tokens}</span></span>
                      )}
                      {req.stop_reason && (
                        <span>stop_reason <span className="text-zinc-300">{req.stop_reason}</span></span>
                      )}
                      {req.error_type && (
                        <span>error_type <span className="text-rose-400">{req.error_type}</span></span>
                      )}
                      {req.ttft_ms != null && (
                        <span>ttft <span className="text-zinc-300">{req.ttft_ms}ms</span></span>
                      )}
                    </div>
                    {req.error_message && (
                      <div className="bg-rose-900/20 border border-rose-800/30 rounded-lg p-3 text-xs text-rose-300 font-mono leading-relaxed">
                        {req.error_message}
                      </div>
                    )}
                    {req.system_prompt && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">System Prompt</span>
                        <pre className="bg-black/40 border border-zinc-800 p-3 rounded-lg overflow-x-auto max-h-48 text-xs text-zinc-300 font-mono leading-relaxed">
                          {req.system_prompt}
                        </pre>
                      </div>
                    )}
                    {req.request_params && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">Parameters</span>
                        <pre className="bg-black/40 border border-zinc-800 p-3 rounded-lg overflow-x-auto max-h-32 text-xs text-zinc-300 font-mono leading-relaxed">
                          {tryPrettyJSON(req.request_params)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Request</span>
                        <span className="text-[10px] text-zinc-600 font-mono">{req.method} {req.path}</span>
                      </div>
                      <pre className="bg-black/40 border border-zinc-800 p-3 rounded-lg overflow-x-auto max-h-64 text-xs text-zinc-300 font-mono leading-relaxed">
                        {tryPrettyJSON(req.request)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">Response</span>
                      <pre className="bg-black/40 border border-zinc-800 p-3 rounded-lg overflow-x-auto max-h-64 text-xs text-zinc-300 font-mono leading-relaxed">
                        {tryPrettyJSON(req.response)}
                      </pre>
                    </div>
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
