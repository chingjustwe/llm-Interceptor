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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-200">API Keys</h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error === 'router_disabled') {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-200">API Keys</h2>
        </div>
        <div className="bg-blue-900/30 border border-blue-700 rounded p-5 text-sm">
          <p className="text-blue-300 font-medium mb-1">Router mode not enabled</p>
          <p className="text-blue-200/70">
            API key management requires router mode. Set{' '}
            <code className="text-blue-200 bg-blue-950 px-1 rounded">mode: router</code> in your
            config file and restart the server.
          </p>
        </div>
      </div>
    )
  }

  if (error === 'fetch_error') {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-200">API Keys</h2>
        </div>
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">Unable to load API keys</p>
          <p className="text-sm mt-1">Check that the backend is running and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-200">API Keys</h2>
        <button
          onClick={() => setShowGenerate(true)}
          className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          + Generate Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">No API keys yet</p>
          <p className="text-sm mt-1">Generate a key to start routing LLM requests.</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-slate-400 text-xs uppercase">
                <th className="text-left px-4 py-3 font-medium">Key Prefix</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                  <td className="px-4 py-3 font-mono text-slate-300">{k.key_prefix}</td>
                  <td className="px-4 py-3 text-slate-200">{k.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'px-2 py-0.5 rounded text-xs ' +
                        (k.enabled
                          ? 'bg-emerald-900 text-emerald-300'
                          : 'bg-slate-700 text-slate-400')
                      }
                    >
                      {k.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatTime(k.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {k.enabled && (
                      <button
                        onClick={() => setDisablingId(k.id)}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors"
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
      )}

      {showGenerate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Generate API Key</h3>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (optional)"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowGenerate(false)
                  setNewKeyName('')
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {generatedKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-base font-semibold text-emerald-400 mb-2">Key Generated</h3>
            <p className="text-xs text-slate-400 mb-3">
              Copy this key now — it won't be shown again.
            </p>
            <div className="bg-slate-900 rounded p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">Name: {generatedKey.name}</p>
              <code className="text-sm text-emerald-300 break-all select-all">
                {generatedKey.key}
              </code>
            </div>
            <button
              onClick={() => setGeneratedKey(null)}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2 rounded text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {disablingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-base font-semibold text-slate-200 mb-2">Disable Key</h3>
            <p className="text-sm text-slate-400 mb-4">
              Are you sure you want to disable this API key? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDisablingId(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="bg-red-700 hover:bg-red-600 disabled:bg-slate-600 text-white px-4 py-2 rounded text-sm transition-colors"
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
