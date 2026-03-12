import React from 'react'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <Loader2 size={24} style={styles.spinner} className="animate-spin" />
        <div style={styles.text}>Chargement...</div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  inner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  spinner: {
    color: 'var(--brand)',
  },
  text: {
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    fontSize: 13,
  },
}
