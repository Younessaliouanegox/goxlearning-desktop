import React from 'react'
import { MessageSquare, FolderOpen, Megaphone, Palette, Headphones, type LucideIcon } from 'lucide-react'

interface EmptyProps {
  icon: LucideIcon
  text: string
  sub?: string
  color?: string
}

export default function Empty({ icon: Icon, text, sub, color = 'var(--text-tertiary)' }: EmptyProps) {
  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.iconWrap}>
        <Icon size={26} style={{ color }} />
      </div>
      <div style={styles.text}>{text}</div>
      {sub && <div style={styles.sub}>{sub}</div>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 48,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: 'var(--bg-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  sub: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginTop: 4,
  },
}
