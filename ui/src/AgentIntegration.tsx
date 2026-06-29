import { useEffect, useRef, useState } from 'react'

type AgentInfo = {
  default_base_url: string
  router_enabled: boolean
  supported_protocols: string[]
  models: string[]
}

type AgentKey = 'claude-code' | 'opencode' | 'codex-cli' | 'cline' | 'roo-code' | 'aider' | 'continue'

type AgentTemplate = {
  key: AgentKey
  name: string
  icon: JSX.Element
  language: string
  generate: (baseUrl: string, apiKey: string, models: string[]) => string
}

const ClaudeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const TerminalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
)

const PlugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v6M8 6V2M16 6V2M6 10h12v4a6 6 0 0 1-12 0v-4z" />
    <line x1="12" y1="20" x2="12" y2="22" />
  </svg>
)

const RocketIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const HelpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const agents: AgentTemplate[] = [
  {
    key: 'claude-code',
    name: 'Claude Code',
    icon: <ClaudeIcon />,
    language: 'bash',
    generate: (baseUrl, apiKey) =>
      `export ANTHROPIC_BASE_URL="${baseUrl}"\nexport ANTHROPIC_API_KEY="${apiKey}"`,
  },
  {
    key: 'opencode',
    name: 'OpenCode',
    icon: <CodeIcon />,
    language: 'json',
    generate: (baseUrl, apiKey, models) =>
      JSON.stringify(
        {
          provider: {
            name: 'llm-interceptor',
            api: 'openai',
            baseURL: `${baseUrl}/v1`,
            apiKey,
            models: models.length > 0 ? models : ['claude-sonnet-4', 'gpt-4o'],
          },
        },
        null,
        2
      ),
  },
  {
    key: 'codex-cli',
    name: 'Codex CLI',
    icon: <TerminalIcon />,
    language: 'bash',
    generate: (baseUrl, apiKey) =>
      `export OPENAI_BASE_URL="${baseUrl}/v1"\nexport OPENAI_API_KEY="${apiKey}"`,
  },
  {
    key: 'cline',
    name: 'Cline',
    icon: <PlugIcon />,
    language: 'json',
    generate: (baseUrl, apiKey) =>
      JSON.stringify(
        {
          openAiProvider: {
            baseUrl: `${baseUrl}/v1`,
            apiKey,
            modelId: 'claude-sonnet-4',
          },
        },
        null,
        2
      ),
  },
  {
    key: 'roo-code',
    name: 'Roo Code',
    icon: <RocketIcon />,
    language: 'json',
    generate: (baseUrl, apiKey) =>
      JSON.stringify(
        {
          openAiProvider: {
            baseUrl: `${baseUrl}/v1`,
            apiKey,
            modelId: 'claude-sonnet-4',
          },
        },
        null,
        2
      ),
  },
  {
    key: 'aider',
    name: 'Aider',
    icon: <HelpIcon />,
    language: 'bash',
    generate: (baseUrl, apiKey) =>
      `aider --openai-api-base "${baseUrl}/v1" \\\n     --openai-api-key "${apiKey}" \\\n     --model openai/claude-sonnet-4`,
  },
  {
    key: 'continue',
    name: 'Continue.dev',
    icon: <CodeIcon />,
    language: 'json',
    generate: (baseUrl, apiKey) =>
      JSON.stringify(
        {
          models: [
            {
              title: 'LLM Interceptor',
              provider: 'openai',
              model: 'claude-sonnet-4',
              apiBase: `${baseUrl}/v1`,
              apiKey,
            },
          ],
        },
        null,
        2
      ),
  },
]

export default function AgentIntegration() {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<AgentKey>('claude-code')
  const [baseUrl, setBaseUrl] = useState(() => window.location.origin)
  const [apiKey, setApiKey] = useState('sk-lli-your-api-key')
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/agents/info')
      .then((r) => {
        if (!r.ok) throw new Error('FETCH_FAILED')
        return r.json()
      })
      .then((data: AgentInfo) => {
        setAgentInfo(data)
        if (data.default_base_url) {
          setBaseUrl(data.default_base_url)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const currentAgent = agents.find((a) => a.key === selectedAgent)!
  const models = agentInfo?.models ?? []
  const snippet = currentAgent.generate(baseUrl, apiKey, models)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = snippet
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Agent Integration</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure your AI coding agents to route through LLM Interceptor for observability and governance.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" />
          Loading agent info...
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4 mb-6">
        {/* Agent selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Agent</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentKey)}
            className="w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
          >
            {agents.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Base URL and API Key inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:8080"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-lli-your-api-key"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Code snippet */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {/* Code block header */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">{currentAgent.icon}</span>
            <span className="text-xs font-medium text-zinc-300">{currentAgent.name}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{currentAgent.language}</span>
          </div>
          <button
            onClick={handleCopy}
            className={
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-150 ' +
              (copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-700 hover:text-zinc-100')
            }
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Code content */}
        <pre className="p-4 text-sm text-zinc-200 font-mono overflow-x-auto leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </div>

      {/* Agent info footer */}
      {agentInfo && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
          {agentInfo.router_enabled && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Router enabled
            </span>
          )}
          {(agentInfo.supported_protocols?.length ?? 0) > 0 && (
            <span>Protocols: {agentInfo.supported_protocols.join(', ')}</span>
          )}
          {(agentInfo.models?.length ?? 0) > 0 && (
            <span>Models: {agentInfo.models!.slice(0, 5).join(', ')}{agentInfo.models!.length > 5 ? '...' : ''}</span>
          )}
        </div>
      )}
    </div>
  )
}
