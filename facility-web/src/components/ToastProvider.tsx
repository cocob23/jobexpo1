import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  message: string
  type: ToastType
  duration: number
}

type ToastContextValue = {
  show: (message: string, opts?: { type?: ToastType; duration?: number }) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((xs) => xs.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, opts?: { type?: ToastType; duration?: number }) => {
    const id = Math.random().toString(36).slice(2)
    const item: ToastItem = {
      id,
      message,
      type: opts?.type ?? 'info',
      duration: Math.max(800, opts?.duration ?? 2800),
    }
    setToasts((xs) => [...xs, item])
    window.setTimeout(() => remove(id), item.duration)
  }, [remove])

  const value = useMemo<ToastContextValue>(() => ({
    show,
    success: (m, d) => show(m, { type: 'success', duration: d }),
    error: (m, d) => show(m, { type: 'error', duration: d }),
    info: (m, d) => show(m, { type: 'info', duration: d }),
  }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container */}
      <div style={styles.container}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...styles.toast, ...byType[t.type] }}>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => remove(t.id)} style={styles.close} aria-label="Cerrar">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 240,
    maxWidth: 380,
    background: '#334155',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 10,
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    pointerEvents: 'auto',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    fontSize: 14,
  },
  close: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
  },
}

const byType: Record<ToastType, React.CSSProperties> = {
  success: { background: '#059669' },
  error: { background: '#dc2626' },
  info: { background: '#334155' },
}
