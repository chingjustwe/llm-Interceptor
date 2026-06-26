import { useEffect, useState } from 'react'

type SessionSummary = {
  id: string
  count: number
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

export default function SessionsList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessionReqs, setSessionReqs] = useState<StoredRequest[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => {
        setSessions(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectSession = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null)
      return
    }
    setSelectedId(id)
    setSessionLoading(true)
    setExpandedReqId(null)
    fetch(`/api/sessions/${encodeURIComponent(id)}/requests?limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setSessionReqs(data)
        setSessionLoading(false)
      })
      .catch(() => setSessionLoading(false))
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg">No sessions yet</p>
        <p className="text-sm mt-1">Requests with a session ID will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const isOpen = selectedId === s.id
        return (
          <div key={s.id}>
            <div
              className="flex items-center gap-4 px-4 py-3 bg-slate-800 rounded cursor-pointer hover:bg-slate-750 transition-colors"
              onClick={() => selectSession(s.id)}
            >
              <span className="font-mono text-blue-400 flex-1 truncate" title={s.id}>
                {s.id}
              </span>
              <span className="text-slate-400 text-sm">
                {s.count} request{s.count !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-500 text-xs">{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div className="bg-slate-850 border border-slate-700 rounded-b p-4">
                {sessionLoading ? (
                  <div className="h-12 bg-slate-800 rounded animate-pulse" />
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 mb-2">
                      Total requests: {sessionReqs.length} |{' '}
                      Total tokens:{' '}
                      {sessionReqs.reduce(
                        (sum, r) =>
                          sum +
                          r.usage.input_tokens +
                          r.usage.output_tokens +
                          r.usage.cache_read_tokens +
                          r.usage.cache_creation_tokens,
                        0,
                      )}
                    </div>
                    {sessionReqs.map((req) => (
                      <div key={req.id}>
                        <div
                          className="flex items-center gap-4 px-3 py-2 bg-slate-900 rounded cursor-pointer hover:bg-slate-800 transition-colors text-sm"
                          onClick={() =>
                            setExpandedReqId(expandedReqId === req.id ? null : req.id)
                          }
                        >
                          <span className="font-mono text-emerald-400 w-24 truncate">
                            {req.id.slice(0, 12)}
                          </span>
                          <span className="w-36 truncate text-slate-200">{req.model}</span>
                          <span className="text-slate-400">{req.duration_ms}ms</span>
                          <span
                            className={
                              'px-2 py-0.5 rounded text-xs ' +
                              (req.status_code === 200
                                ? 'bg-emerald-900 text-emerald-300'
                                : 'bg-red-900 text-red-300')
                            }
                          >
                            {req.status_code}
                          </span>
                          <span className="ml-auto text-slate-500 text-xs">
                            {formatTime(req.created_at)}
                          </span>
                        </div>
                        {expandedReqId === req.id && (
                          <div className="bg-slate-900 border-t border-slate-700 p-3 space-y-2 text-xs font-mono">
                            <div className="text-slate-400 text-xs font-sans">Request:</div>
                            <pre className="bg-slate-950 p-2 rounded overflow-x-auto max-h-48 text-slate-300">
                              {tryPrettyJSON(req.request)}
                            </pre>
                            <div className="text-slate-400 text-xs font-sans">Response:</div>
                            <pre className="bg-slate-950 p-2 rounded overflow-x-auto max-h-48 text-slate-300">
                              {tryPrettyJSON(req.response)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
