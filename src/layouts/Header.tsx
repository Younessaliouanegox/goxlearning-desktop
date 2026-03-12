import React from 'react'
import { colors } from '../lib/theme'

interface HeaderProps {
  groupName: string
  onMenuClick: () => void
}

export default function Header({ groupName, onMenuClick }: HeaderProps) {
  return (
    <div style={styles.header} className="titlebar-drag">
      <button style={styles.menuBtn} onClick={onMenuClick} className="titlebar-nodrag">
        ☰
      </button>
      <div style={styles.groupPill} className="titlebar-nodrag">
        {groupName}
      </div>
      <div style={styles.avatar} className="titlebar-nodrag">👤</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: colors.white,
  },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    background: colors.background, border: 'none',
    cursor: 'pointer', fontSize: 18,
  },
  groupPill: {
    flex: 1, margin: '0 12px', padding: '8px 16px',
    borderRadius: 999, background: colors.background,
    border: `1.5px solid ${colors.brand}`,
    textAlign: 'center' as any, fontWeight: 700,
    fontSize: 14, color: colors.brand,
    whiteSpace: 'nowrap' as any, overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    background: colors.background,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18,
  },
}
