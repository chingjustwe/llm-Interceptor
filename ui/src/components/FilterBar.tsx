type Filter = {
  key: string
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

type FilterBarProps = {
  filters: Filter[]
  onClear: () => void
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function FilterBar({ filters, onClear }: FilterBarProps) {
  const hasActive = filters.some((f) => f.value !== '')
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {filters.map((f) => (
        <div key={f.key} className="relative flex-1 max-w-xs min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"><SearchIcon /></span>
          <input
            type="text"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            placeholder={f.placeholder || `Filter by ${f.label}...`}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
          />
        </div>
      ))}
      {hasActive && (
        <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors shrink-0">
          <ClearIcon /> Clear
        </button>
      )}
    </div>
  )
}
