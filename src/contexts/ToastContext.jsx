import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((type, title, message = '') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const remove = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={remove} />)}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const STYLES = {
  success: { border: 'border-l-green-500',  icon: '✅', title: 'text-green-800', msg: 'text-green-700', bg: 'bg-green-50' },
  error:   { border: 'border-l-red-500',    icon: '❌', title: 'text-red-800',   msg: 'text-red-700',   bg: 'bg-red-50'   },
  info:    { border: 'border-l-blue-500',   icon: 'ℹ️', title: 'text-blue-800',  msg: 'text-blue-700',  bg: 'bg-blue-50'  },
  warning: { border: 'border-l-amber-500',  icon: '⚠️', title: 'text-amber-800', msg: 'text-amber-700', bg: 'bg-amber-50' },
}

function ToastItem({ toast, onRemove }) {
  const s = STYLES[toast.type] || STYLES.info
  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-l-4 shadow-lg ${s.bg} ${s.border} animate-fade-in`}>
      <span className="text-base mt-0.5 shrink-0">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${s.title}`}>{toast.title}</div>
        {toast.message && <div className={`text-xs mt-0.5 ${s.msg}`}>{toast.message}</div>}
      </div>
      <button onClick={() => onRemove(toast.id)} className="text-gray-400 hover:text-gray-600 text-sm leading-none shrink-0">✕</button>
    </div>
  )
}
