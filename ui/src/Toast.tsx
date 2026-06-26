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
      className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-3 rounded-lg shadow-lg cursor-pointer text-sm animate-slide-in"
      onClick={() => onDismiss(toast.id)}
    >
      <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shrink-0" />
      <span className="font-semibold">{toast.model}</span>
      <span className="text-emerald-200">|</span>
      <span className="font-mono text-xs opacity-80">{toast.message}</span>
    </div>
  )
}
