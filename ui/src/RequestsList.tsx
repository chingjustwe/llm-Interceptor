import { useEffect, useRef, useState } from 'react'

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
  if (code === 429) return 'bg-amber-900/60 text-amber-300'
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function RequestsList() {
  const [requests, setRequests] = useState<StoredRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modelFilter, setModelFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const debouncedModel = useDebounce(modelFilter, 300)
  const debouncedSession = useDebounce(sessionFilter, 300)
  const fetchedRef = useRef(false)

  useEffect(() => {
    fetchedRef.current = true
    const params = new URLSearchParams({ limit: '50' })
    if (debouncedModel) params.set('model', debouncedModel)
    if (debouncedSession) params.set('session_id', debouncedSession)
    setLoading(true)
    fetch(`/api/requests?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data)
        setLoading(false)
        setExpandedId(null)
      })
      .catch(() => setLoading(false))
  }, [debouncedModel, debouncedSession])

  const hasFilter = modelFilter !== '' || sessionFilter !== ''
  const showInitialSkeleton = !fetchedRef.current || (loading && requests.length === 0 && !hasFilter)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">Requests</h2>
        {!showInitialSkeleton && (
          <span className="text-xs text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-full font-mono">
            {requests.length} result{requests.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter bar — always rendered in the same DOM position */}
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
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            placeholder="Filter by session ID..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>
        {hasFilter && (
          <button
            onClick={() => { setModelFilter(''); setSessionFilter('') }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors shrink-0"
          >
            <ClearIcon />
            Clear
          </button>
        )}
      </div>

      {/* Content — initial load skeleton */}
      {showInitialSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <svg className="mx-auto mb-3 w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <p className="text-base">{hasFilter ? 'No matching requests' : 'No requests yet'}</p>
          <p className="text-sm mt-1 text-zinc-600">
            {hasFilter ? 'Try adjusting your filters.' : 'Send an LLM request through the proxy to see it here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Subtle loading indicator during filter */}
          {loading && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
              Refreshing...
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
                  <span className="font-mono text-xs text-cyan-400 w-20 truncate shrink-0" title={req.id}>
                    {req.id.slice(0, 12)}
                  </span>
                  <span className="font-mono text-xs text-zinc-500 w-20 truncate shrink-0" title={req.session_id}>
                    {req.session_id.slice(0, 12)}
                  </span>
                  <span className="flex-1 text-sm text-zinc-200 truncate min-w-0">{req.model}</span>
                  <span className="text-xs text-zinc-500 font-mono tabular-nums w-16 text-right shrink-0">{req.duration_ms}ms</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono shrink-0 ${statusColor(req.status_code)}`}>
                    {req.status_code}
                  </span>
                  <span className="text-xs text-zinc-600 tabular-nums shrink-0">{formatTime(req.created_at)}</span>
                </div>
                {isExpanded && (
                  <div className="bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-lg px-4 py-4 space-y-3 animate-slide-down">
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                      <span>input <span className="text-zinc-300">{req.usage.input_tokens}</span></span>
                      <span>output <span className="text-zinc-300">{req.usage.output_tokens}</span></span>
                      {req.usage.cache_read_tokens > 0 && (
                        <span>cache_read <span className="text-zinc-300">{req.usage.cache_read_tokens}</span></span>
                      )}
                      {req.usage.cache_creation_tokens > 0 && (
                        <span>cache_create <span className="text-zinc-300">{req.usage.cache_creation_tokens}</span></span>
                      )}
                    </div>
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
