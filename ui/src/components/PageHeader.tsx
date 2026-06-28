import { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: { label: string; onClick?: () => void }[]
}

export default function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-700">/</span>}
              {crumb.onClick ? (
                <button onClick={crumb.onClick} className="hover:text-zinc-300 transition-colors">{crumb.label}</button>
              ) : (
                <span className="text-zinc-400">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
