import { useEffect, useState } from 'react'
import SessionDetail from './SessionDetail'
import CostDashboard from './CostDashboard'

type Request = {
  id: string
  session_id: string
  model: string
  duration_ms: number
  status_code: number
  created_at: number
}

type Session = {
  id: string
  count: number
}

type View = 'overview' | 'dashboard'

function App() {
  const [requests, setRequests] = useState<Request[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [events, setEvents] = useState<string[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [view, setView] = useState<View>('overview')

  useEffect(() => {
    fetch('/api/requests?limit=20')
      .then(r => r.json())
      .then(data => setRequests(data || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => setSessions(data || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (e) => {
      setEvents(prev => [e.data, ...prev].slice(0, 50))
    }
    return () => es.close()
  }, [])

  if (selectedSession) {
    return (
      <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
        <SessionDetail sessionId={selectedSession} onBack={() => { setSelectedSession(null); setView('overview') }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', fontFamily: 'monospace' }}>
      <h1>LLM Interceptor</h1>
      <nav style={{ marginBottom: '1rem' }}>
        <button onClick={() => setView('overview')} style={{ marginRight: '0.5rem', fontWeight: view === 'overview' ? 'bold' : 'normal' }}>Overview</button>
        <button onClick={() => setView('dashboard')} style={{ fontWeight: view === 'dashboard' ? 'bold' : 'normal' }}>Cost Dashboard</button>
      </nav>

      {view === 'overview' && (
        <>
          <h2>Sessions</h2>
          <div style={{ marginBottom: '1rem' }}>
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s.id)}
                style={{ marginRight: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}
              >
                {s.id.slice(0, 16)} ({s.count})
              </button>
            ))}
            {sessions.length === 0 && <p>No sessions yet.</p>}
          </div>

          <h2>Recent Requests</h2>
          <table border={1} cellPadding={6} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Session</th>
                <th>Model</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{r.id.slice(0, 12)}</td>
                  <td>
                    <button
                      onClick={() => setSelectedSession(r.session_id)}
                      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'monospace', textDecoration: 'underline' }}
                    >
                      {r.session_id.slice(0, 12)}
                    </button>
                  </td>
                  <td>{r.model}</td>
                  <td>{r.duration_ms}ms</td>
                  <td>{r.status_code}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Live Events</h2>
          <pre>{events.join('\n')}</pre>
        </>
      )}

      {view === 'dashboard' && <CostDashboard />}
    </div>
  )
}

export default App
