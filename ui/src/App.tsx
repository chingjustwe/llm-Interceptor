import { useCallback, useEffect, useRef, useState } from 'react'
import RequestsList from './RequestsList'
import SessionsList from './SessionsList'
import CostDashboard from './CostDashboard'
import KeyManagement from './KeyManagement'
import Toast from './Toast'

type ToastData = {
  id: string
  model: string
  message: string
}

type View = 'requests' | 'sessions' | 'cost' | 'keys'

type NavItem = {
  id: View
  label: string
  icon: JSX.Element
}

const BoltIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const LayersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="5" />
    <line x1="11.7" y1="11.7" x2="21" y2="21" />
    <line x1="18" y1="15" x2="21" y2="18" />
    <line x1="15" y1="18" x2="18" y2="21" />
  </svg>
)

const navItems: NavItem[] = [
  { id: 'requests', label: 'Requests', icon: <BoltIcon /> },
  { id: 'sessions', label: 'Sessions', icon: <LayersIcon /> },
  { id: 'cost', label: 'Cost', icon: <DollarIcon /> },
  { id: 'keys', label: 'Keys', icon: <KeyIcon /> },
]

export default function App() {
  const [activeView, setActiveView] = useState<View>('requests')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [connected, setConnected] = useState(false)
  const toastIdRef = useRef(0)

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        toastIdRef.current += 1
        const toast: ToastData = {
          id: `toast-${toastIdRef.current}`,
          model: data.model || 'unknown',
          message: (data.id || '').slice(0, 12),
        }
        setToasts((prev) => [...prev.slice(-2), toast])
      } catch {
        // ignore malformed events
      }
    }
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [])

  return (
    <div className="flex h-screen">
      <nav className="w-56 bg-zinc-950 flex flex-col shrink-0 border-r border-zinc-800">
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">Interceptor</h1>
              <p className="text-[11px] text-zinc-500 leading-tight">LLM Gateway</p>
            </div>
          </div>
        </div>
        <div className="flex-1 py-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={
                  'w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150 text-left ' +
                  (isActive
                    ? 'bg-zinc-800/80 text-cyan-400 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_-4px_rgba(34,211,238,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-l-2 border-transparent')
                }
              >
                <span className="w-4 flex justify-center shrink-0">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="px-5 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-rose-500'}`} />
            <span className="text-[11px] text-zinc-500">{connected ? 'Live' : 'Disconnected'}</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5">v0.1.0</p>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-7">
          {activeView === 'requests' && <RequestsList />}
          {activeView === 'sessions' && <SessionsList />}
          {activeView === 'cost' && <CostDashboard />}
          {activeView === 'keys' && <KeyManagement />}
        </div>
      </main>

      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  )
}
