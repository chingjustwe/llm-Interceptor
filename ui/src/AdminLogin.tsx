import { FormEvent, useState } from 'react'
import { useAuth } from './auth'

export default function AdminLogin() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(username, password)
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-xl p-8 w-full max-w-sm border border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">LLM Interceptor</h1>
            <p className="text-[11px] text-zinc-500">Admin Console</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              placeholder="admin"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-900/30 border border-rose-800/50 rounded-lg px-3 py-2">
              <p className="text-rose-300 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
