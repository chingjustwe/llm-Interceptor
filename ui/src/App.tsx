import { useCallback, useEffect, useRef, useState } from 'react'
import RequestsList from './RequestsList'
import SessionsList from './SessionsList'
import CostDashboard from './CostDashboard'
import KeyManagement from './KeyManagement'
import DashboardPage from './DashboardPage'
import ErrorAnalysis from './ErrorAnalysis'
import ModelAnalytics from './ModelAnalytics'
import Toast from './Toast'

type ToastData = { id: string; model: string; message: string }
type View = 'dashboard' | 'requests' | 'sessions' | 'cost' | 'keys' | 'errors' | 'models'

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
    <line x1="15" y1="18" x2="21" y2="21" />
  </svg>
)

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const views: Record<View, { label: string; icon: JSX.Element; component: React.ComponentType }> = {
  dashboard: { label: 'Dashboard', icon: <ActivityIcon />, component: DashboardPage },
  requests: { label: 'Requests', icon: <BoltIcon />, component: RequestsList },
  sessions: { label: 'Sessions', icon: <LayersIcon />, component: SessionsList },
  cost: { label: 'Cost', icon: <DollarIcon />, component: CostDashboard },
  keys: { label: 'Keys', icon: <KeyIcon />, component: KeyManagement },
  errors: { label: 'Errors', icon: <AlertIcon />, component: ErrorAnalysis },
  models: { label: 'Models', icon: <ChartIcon />, component: ModelAnalytics },
}

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [connected, setConnected] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const toastIdRef = useRef(0)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

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
        setToasts((prev) => [...prev.slice(-2), { id: `toast-${toastIdRef.current}`, model: data.model || 'unknown', message: (data.id || '').slice(0, 12) }])
      } catch { /* ignore */ }
    }
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [])

  const ActivePage = views[activeView].component

  return (
    <div className="app-shell flex h-screen bg-zinc-950">
      {/* Sidebar */}
      <nav className="w-48 bg-zinc-950 flex flex-col shrink-0 border-r border-zinc-800">
        <div className="px-4 py-4 border-b border-zinc-800">
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
          {(Object.keys(views) as View[]).map((viewKey) => {
            const v = views[viewKey]
            const isActive = activeView === viewKey
            return (
              <button
                key={viewKey}
                onClick={() => setActiveView(viewKey)}
                className={
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 text-left ' +
                  (isActive
                    ? 'bg-zinc-800/80 text-cyan-400 border-l-2 border-cyan-400 shadow-[inset_0_0_12px_-4px_rgba(34,211,238,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-l-2 border-transparent')
                }
              >
                <span className="w-4 flex justify-center shrink-0">{v.icon}</span>
                <span className="font-medium">{v.label}</span>
              </button>
            )
          })}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full">
            {darkMode ? <SunIcon /> : <MoonIcon />}
            <span>{darkMode ? 'Light' : 'Dark'} Mode</span>
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-rose-500'}`} />
            <span className="text-[11px] text-zinc-500">{connected ? 'Live' : 'Disconnected'}</span>
          </div>
          <p className="text-[11px] text-zinc-600">v0.2.0</p>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <ActivePage />
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  )
}
