import React, { useEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  danger?: boolean
  divider?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

const MENU_WIDTH = 200
const ITEM_HEIGHT = 36
const PADDING = 8
const EDGE_MARGIN = 8

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  // Measure and reposition to stay within viewport
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let nx = x
    let ny = y
    if (x + rect.width > vw - EDGE_MARGIN) nx = vw - rect.width - EDGE_MARGIN
    if (y + rect.height > vh - EDGE_MARGIN) ny = vh - rect.height - EDGE_MARGIN
    if (nx < EDGE_MARGIN) nx = EDGE_MARGIN
    if (ny < EDGE_MARGIN) ny = EDGE_MARGIN
    setPos({ x: nx, y: ny })
  }, [x, y])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleScroll = () => onClose()
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        zIndex: 9999,
        animation: 'ctxIn 0.12s ease',
      }}
    >
      <style>{`@keyframes ctxIn { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }`}</style>
      <div style={styles.menu}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {item.divider && i > 0 && <div style={styles.divider} />}
            <button
              style={{
                ...styles.menuItem,
                color: item.danger ? 'var(--error)' : 'var(--text-primary)',
              }}
              onClick={() => { item.onClick(); onClose() }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = item.danger
                  ? 'var(--error-bg)' : 'var(--brand-light)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              {item.icon && <span style={styles.menuIcon}>{item.icon}</span>}
              <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  menu: {
    minWidth: 190,
    maxWidth: 260,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    padding: '4px 0',
    boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08)',
    overflow: 'hidden',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left' as const,
    transition: 'background 0.1s',
    fontFamily: 'inherit',
  },
  menuIcon: {
    display: 'flex',
    alignItems: 'center',
    color: 'inherit',
    opacity: 0.7,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: 'var(--border-light)',
    margin: '4px 0',
  },
}
