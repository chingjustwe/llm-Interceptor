import { useEffect, useState } from 'react'

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

export default function RequestsList() {
  const [requests, setRequests] = useState<StoredRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/requests?limit=50')
      .then((r) => r.json())
      .then((data) => {
        setRequests(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg">No requests yet</p>
        <p className="text-sm mt-1">Send an LLM request through the proxy to see it here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {requests.map((req) => (
        <div key={req.id}>
          <div
            className="flex items-center gap-4 px-4 py-3 bg-slate-800 rounded cursor-pointer hover:bg-slate-750 transition-colors text-sm"
            onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
          >
            <span className="font-mono text-emerald-400 w-28 truncate" title={req.id}>
              {req.id.slice(0, 12)}
            </span>
            <span className="font-mono text-slate-400 w-28 truncate" title={req.session_id}>
              {req.session_id.slice(0, 12)}
            </span>
            <span className="w-40 truncate text-slate-200">{req.model}</span>
            <span className="w-20 text-right text-slate-400">{req.duration_ms}ms</span>
            <span
              className={
                'w-16 text-center px-2 py-0.5 rounded text-xs ' +
                (req.status_code === 200
                  ? 'bg-emerald-900 text-emerald-300'
                  : 'bg-red-900 text-red-300')
              }
            >
              {req.status_code}
            </span>
            <span className="ml-auto text-slate-500 text-xs">{formatTime(req.created_at)}</span>
          </div>
          {expandedId === req.id && (
            <div className="bg-slate-850 border border-slate-700 rounded-b p-4 space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 text-xs font-sans">Usage: </span>
                <span className="text-slate-300">
                  input={req.usage.input_tokens} output={req.usage.output_tokens}
                  {req.usage.cache_read_tokens > 0 && (
                    <> cache_read={req.usage.cache_read_tokens}</>
                  )}
                  {req.usage.cache_creation_tokens > 0 && (
                    <> cache_create={req.usage.cache_creation_tokens}</>
                  )}
                </span>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-sans mb-1">Request:</div>
                <pre className="bg-slate-900 p-3 rounded overflow-x-auto max-h-64 text-slate-300">
                  {tryPrettyJSON(req.request)}
                </pre>
              </div>
              <div>
                <div className="text-slate-400 text-xs font-sans mb-1">Response:</div>
                <pre className="bg-slate-900 p-3 rounded overflow-x-auto max-h-64 text-slate-300">
                  {tryPrettyJSON(req.response)}
                </pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
