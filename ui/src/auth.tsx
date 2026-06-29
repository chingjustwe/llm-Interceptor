import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type AuthState = {
  token: string | null
  username: string | null
  loading: boolean
}

type AuthContextType = AuthState & {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'llm_interceptor_token'

function parseToken(token: string): { username: string; exp: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return { username: payload.username || 'admin', exp: payload.exp || 0 }
  } catch {
    return null
  }
}

function loadToken(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const info = parseToken(raw)
  if (!info || info.exp * 1000 < Date.now()) {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
  return raw
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = loadToken()
    const info = token ? parseToken(token) : null
    return { token, username: info?.username || null, loading: false }
  })

  useEffect(() => {
    const token = loadToken()
    if (token !== state.token) {
      const info = parseToken(token || '')
      setState({ token, username: info?.username || null, loading: false })
    }
  }, [])

  const login = async (username: string, password: string) => {
    const resp = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'login failed' }))
      throw new Error(err.error || 'login failed')
    }
    const data = await resp.json()
    localStorage.setItem(STORAGE_KEY, data.token)
    setState({ token: data.token, username, loading: false })
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ token: null, username: null, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useAuthedFetch() {
  const { token, logout } = useAuth()

  return (url: string, options?: RequestInit): Promise<Response> => {
    const headers = new Headers(options?.headers)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, { ...options, headers }).then((resp) => {
      if (resp.status === 401) {
        logout()
      }
      return resp
    })
  }
}
