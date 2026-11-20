// Tiny app-wide toasts: short confirmations that something happened, with an optional undo-style action.
import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

let toasts: Toast[] = []
let next = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string, action?: Toast['action'], ms = 3600) {
  const t: Toast = { id: next++, text, action }
  toasts = [...toasts.slice(-2), t]
  emit()
  window.setTimeout(() => dismiss(t.id), ms)
  return t.id
}

export function dismiss(id: number) {
  if (!toasts.some((t) => t.id === id)) return
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )
}
