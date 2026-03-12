import React, { useEffect, useRef } from 'react'
import { Bell, Megaphone, AtSign, Palette, ListTodo, CheckCheck, X } from 'lucide-react'
import type { Notification } from '../lib/hooks/useNotifications'

interface NotificationPanelProps {
  notifications: Notification[]
  onClose: () => void
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'mention': return <AtSign size={14} />
    case 'announcement': return <Megaphone size={14} />
    case 'creativity': return <Palette size={14} />
    case 'todo': return <ListTodo size={14} />
    default: return <Bell size={14} />
  }
}

function getColor(type: Notification['type']) {
  switch (type) {
    case 'mention': return { bg: 'var(--brand-light)', color: 'var(--brand)' }
    case 'announcement': return { bg: '#FFF3E0', color: '#E65100' }
    case 'creativity': return { bg: '#F3E5F5', color: '#6A1B9A' }
    case 'todo': return { bg: '#E8F5E9', color: '#2E7D32' }
    default: return { bg: 'var(--bg-muted)', color: 'var(--text-secondary)' }
  }
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return `Il y a ${Math.floor(hrs / 24)}j`
}

export default function NotificationPanel({ notifications, onClose, onMarkAllRead, onMarkRead }: NotificationPanelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const unread = notifications.filter(n => !n.read)
  const read = notifications.filter(n => n.read)

  return (
    <div style={styles.panel} ref={ref}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Bell size={15} />
          <span>Notifications</span>
          {unread.length > 0 && <span style={styles.countBadge}>{unread.length}</span>}
        </div>
        <div style={styles.headerActions}>
          {unread.length > 0 && (
            <button style={styles.markAllBtn} onClick={onMarkAllRead} title="Tout marquer comme lu">
              <CheckCheck size={14} />
            </button>
          )}
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={styles.list}>
        {notifications.length === 0 && (
          <div style={styles.empty}>
            <Bell size={28} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Aucune notification</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Vous êtes à jour !</div>
          </div>
        )}

        {unread.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Nouvelles</div>
            {unread.map(n => (
              <NotifItem key={n.id} notification={n} onRead={() => onMarkRead(n.id)} />
            ))}
          </>
        )}

        {read.length > 0 && (
          <>
            <div style={styles.sectionLabel}>Précédentes</div>
            {read.map(n => (
              <NotifItem key={n.id} notification={n} onRead={() => {}} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function NotifItem({ notification, onRead }: { notification: Notification; onRead: () => void }) {
  const c = getColor(notification.type)
  return (
    <button style={{ ...styles.item, background: notification.read ? 'transparent' : 'var(--bg-muted)' }} onClick={onRead}>
      <div style={{ ...styles.itemIcon, background: c.bg, color: c.color }}>
        {getIcon(notification.type)}
      </div>
      <div style={styles.itemContent}>
        <div style={styles.itemTitle}>
          {notification.title}
          {!notification.read && <div style={styles.unreadDot} />}
        </div>
        <div style={styles.itemBody}>{notification.body}</div>
        <div style={styles.itemTime}>{timeAgo(notification.created_at)}</div>
      </div>
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute' as any,
    top: 42,
    right: 0,
    width: 340,
    maxHeight: 460,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 14,
    boxShadow: '0 12px 40px rgba(0,0,0,.15)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column' as any,
    overflow: 'hidden',
    animation: 'ctxIn 0.15s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: 800,
    color: '#fff',
    background: 'var(--brand)',
    borderRadius: 99,
    padding: '1px 7px',
    lineHeight: '16px',
  },
  markAllBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: 'none',
    background: 'var(--bg-muted)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as any,
    padding: '4px 0',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as any,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as any,
    letterSpacing: '0.05em',
    padding: '8px 14px 4px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as any,
    fontFamily: 'inherit',
    transition: 'background 0.1s',
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--brand)',
    flexShrink: 0,
  },
  itemBody: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    marginTop: 2,
    lineHeight: '15px',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemTime: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    marginTop: 3,
  },
}
