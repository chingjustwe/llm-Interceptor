import { ReactNode } from 'react'

type Column<T> = {
  key: string
  label: string
  render?: (item: T) => ReactNode
  sortable?: boolean
  width?: string
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onSort?: (key: string, dir: 'asc' | 'desc') => void
}

export default function DataTable<T extends Record<string, any>>({ columns, data, loading, emptyMessage = 'No data', onSort }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-900 animate-pulse border-b border-zinc-800 last:border-0" />
          ))}
        </div>
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl text-center py-16 text-zinc-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 font-medium ${col.sortable ? 'cursor-pointer hover:text-zinc-300' : ''} ${col.width || ''}`}
                  onClick={() => col.sortable && onSort?.(col.key, 'asc')}
                >
                  {col.label}
                  {col.sortable && ' ↕'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.id || i} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-zinc-300 font-mono text-sm">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
