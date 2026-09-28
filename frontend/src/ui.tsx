import type { ReactNode } from 'react'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return <div className="error-note">{message}</div>
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}