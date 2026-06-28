import { useEffect, useState } from 'react'

type ApiKey = {
  id: string
  key_prefix: string
  name: string
  enabled: boolean
  created_at: number
}

type GenerateResult = {
  key: string
  key_prefix: string
  name: string
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleString()
}

export default function KeyManagement() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showGenerate, setShowGenerate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<GenerateResult | null>(null)

  const [disablingId, setDisablingId] = useState<string | null>(null)
  const [disabling, setDisabling] = useState(false)

  const fetchKeys = () => {
    setLoading(true)
    setError(null)
    fetch('/api/keys')
      .then((r) => {
        if (r.status === 503) throw new Error('ROUTER_DISABLED')
        if (!r.ok) throw new Error('FETCH_ERROR')
        return r.json()
      })
      .then((data) => {
        setKeys(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message === 'ROUTER_DISABLED' ? 'router_disabled' : 'fetch_error')
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleGenerate = () => {
    setGenerating(true)
    fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || 'default' }),
    })
      .then((r) => r.json())
      .then((data: GenerateResult) => {
        setGeneratedKey(data)
        setShowGenerate(false)
        setNewKeyName('')
        setGenerating(false)
        fetchKeys()
      })
      .catch(() => setGenerating(false))
  }

  const handleDisable = () => {
    if (!disablingId) return
    setDisabling(true)
    fetch(`/api/keys/${disablingId}/disable`, { method: 'PATCH' })
      .then((r) => r.json())
      .then(() => {
        setDisablingId(null)
        setDisabling(false)
        fetchKeys()
      })
      .catch(() => setDisabling(false))
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-100">API Keys</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error === 'router_disabled') {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-100">API Keys</h2>
        </div>
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse-dot" />
            <p className="text-indigo-300 font-medium text-sm">Router mode not enabled</p>
          </div>
          <p className="text-indigo-200/60 text-sm ml-5">
            API key management requires router mode. Set{' '}
            <code className="text-indigo-200 bg-indigo-950/60 px-1.5 py-0.5 rounded text-xs font-mono">mode: router</code>{' '}
            in your config file and restart the server.
          </p>
        </div>
      </div>
    )
  }

  if (error === 'fetch_error') {
    return (
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-100">API Keys</h2>
        </div>
        <div className="text-center py-20 text-zinc-500">
          <p className="text-base">Unable to load API keys</p>
          <p className="text-sm mt-1 text-zinc-600">Check that the backend is running and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-zinc-100">API Keys</h2>
        <button
          onClick={() => setShowGenerate(true)}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.3)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Generate Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <svg className="mx-auto mb-3 w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="5" />
            <line x1="11.7" y1="11.7" x2="21" y2="21" />
            <line x1="18" y1="15" x2="21" y2="18" />
            <line x1="15" y1="18" x2="18" y2="21" />
          </svg>
          <p className="text-base">No API keys yet</p>
          <p className="text-sm mt-1 text-zinc-600">Generate a key to start routing LLM requests.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Key Prefix</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k, i) => (
                  <tr key={k.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-zinc-300">{k.key_prefix}</td>
                    <td className="px-4 py-3 text-zinc-200">{k.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'px-2 py-0.5 rounded text-[11px] font-medium ' +
                          (k.enabled
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-zinc-700/60 text-zinc-400')
                        }
                      >
                        {k.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{formatTime(k.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {k.enabled && (
                        <button
                          onClick={() => setDisablingId(k.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors"
                        >
                          Disable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl p-6 w-96 shadow-2xl border border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-100 mb-4">Generate API Key</h3>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (optional)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowGenerate(false)
                  setNewKeyName('')
                }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {generatedKey && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl p-6 w-96 shadow-2xl border border-zinc-800">
            <h3 className="text-base font-semibold text-emerald-400 mb-2">Key Generated</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Copy this key now — it won't be shown again.
            </p>
            <div className="bg-black/50 border border-zinc-800 rounded-lg p-3.5 mb-5">
              <p className="text-[11px] text-zinc-500 mb-1.5 font-medium">Name: {generatedKey.name}</p>
              <code className="text-sm text-emerald-300 break-all select-all font-mono leading-relaxed">
                {generatedKey.key}
              </code>
            </div>
            <button
              onClick={() => setGeneratedKey(null)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {disablingId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl p-6 w-96 shadow-2xl border border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-100 mb-2">Disable Key</h3>
            <p className="text-sm text-zinc-400 mb-5">
              Are you sure you want to disable this API key? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDisablingId(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
              >
                {disabling ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
