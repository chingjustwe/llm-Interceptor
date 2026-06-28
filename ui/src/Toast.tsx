import { useEffect } from 'react'

type ToastData = {
  id: string
  model: string
  message: string
}

export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl cursor-pointer text-sm animate-slide-in hover:bg-zinc-800/80 transition-colors"
      onClick={() => onDismiss(toast.id)}
    >
      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-dot shrink-0" />
      <span className="font-semibold text-cyan-400">{toast.model}</span>
      <span className="text-zinc-600">|</span>
      <span className="font-mono text-xs text-zinc-400 truncate max-w-[120px]">{toast.message}</span>
    </div>
  )
}
