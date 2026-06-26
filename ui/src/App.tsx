import { useCallback, useEffect, useRef, useState } from 'react'
import RequestsList from './RequestsList'
import SessionsList from './SessionsList'
import CostDashboard from './CostDashboard'
import Toast from './Toast'

type ToastData = {
  id: string
  model: string
  message: string
}

type View = 'requests' | 'sessions' | 'cost'

type NavItem = {
  id: View
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'requests', label: 'Requests', icon: '⚡' },
  { id: 'sessions', label: 'Sessions', icon: '⊞' },
  { id: 'cost', label: 'Cost', icon: '$' },
]

export default function App() {
  const [activeView, setActiveView] = useState<View>('requests')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const toastIdRef = useRef(0)

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/events')
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
    return () => es.close()
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-56 bg-slate-950 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <h1 className="text-lg font-bold text-emerald-400 tracking-tight">LLM Interceptor</h1>
          <p className="text-xs text-slate-500 mt-0.5">local LLM gateway</p>
        </div>
        <div className="flex-1 py-3">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={
                  'w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors text-left ' +
                  (isActive
                    ? 'bg-slate-800 text-emerald-300 border-l-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent')
                }
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-600">
          v0.1.0
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {activeView === 'requests' && <RequestsList />}
          {activeView === 'sessions' && <SessionsList />}
          {activeView === 'cost' && <CostDashboard />}
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
