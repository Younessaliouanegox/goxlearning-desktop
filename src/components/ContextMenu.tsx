import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom'

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

const M = 10 // margin from all viewport edges

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  // Measure after paint then clamp within viewport with 10px margin
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Double rAF ensures the browser has fully painted the menu
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const w = el.offsetWidth
        const h = el.offsetHeight
        const vw = window.innerWidth
        const vh = window.innerHeight

        let nx = x
        let ny = y

        // Clamp right
        if (nx + w > vw - M) nx = vw - w - M
        // Clamp bottom
        if (ny + h > vh - M) ny = vh - h - M
        // Clamp left
        if (nx < M) nx = M
        // Clamp top
        if (ny < M) ny = M

        setPos({ x: nx, y: ny })
      })
    })
  }, [x, y])

  // Close on outside click, Escape, or scroll
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

  const menu = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos ? pos.y : -9999,
        left: pos ? pos.x : -9999,
        zIndex: 99999,
        opacity: pos ? 1 : 0,
        animation: pos ? 'ctxIn 0.12s ease' : 'none',
        pointerEvents: pos ? 'auto' : 'none',
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

  // Render as a portal on document.body so no parent overflow can clip it
  return ReactDOM.createPortal(menu, document.body)
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
