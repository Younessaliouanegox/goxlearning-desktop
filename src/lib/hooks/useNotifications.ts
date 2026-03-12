import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { getNotifPrefs } from './useNotifPrefs'

function sendNativeNotification(title: string, body: string) {
  const prefs = getNotifPrefs()
  if (!prefs.all || !prefs.native) return
  try {
    window.electronAPI?.showNotification({ title, body })
  } catch { /* not in Electron */ }
}

function updateBadge(count: number) {
  try {
    window.electronAPI?.setBadgeCount(count)
  } catch { /* not in Electron */ }
}

export interface Notification {
  id: string
  type: 'message' | 'announcement' | 'mention' | 'creativity' | 'todo'
  title: string
  body: string
  group_name?: string
  created_at: string
  read: boolean
}

export function useNotifications(studentId: string, studentName: string, groupIds: string[]) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!groupIds.length) { setLoading(false); return }

    try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // last 24h

    const [msgRes, annRes, todoRes, creativityRes] = await Promise.all([
      // Messages mentioning this user (by name)
      supabase
        .from('group_messages')
        .select('id, content, sender_name, group_id, created_at')
        .in('group_id', groupIds)
        .ilike('content', `%@${studentName}%`)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20),

      // Recent announcements in user's groups
      supabase
        .from('group_announcements')
        .select('id, title, content, group_id, created_at, priority')
        .in('group_id', groupIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(15),

      // Recent todos assigned to user
      supabase
        .from('student_todos')
        .select('id, title, created_at, is_completed')
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(10),

      // Creativity uploads with feedback (reviewed/approved)
      supabase
        .from('creativity_uploads')
        .select('id, title, feedback, status, created_at')
        .eq('student_id', studentId)
        .in('status', ['reviewed', 'approved'])
        .not('feedback', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    // Read state from localStorage
    const readIds: string[] = JSON.parse(localStorage.getItem('notif_read') || '[]')

    const items: Notification[] = []

    const prefs = getNotifPrefs()

    // Mentions
    if (prefs.mentions) {
    ;(msgRes.data || []).forEach((m: any) => {
      items.push({
        id: `mention-${m.id}`,
        type: 'mention',
        title: `${m.sender_name || 'Quelqu\'un'} vous a mentionné`,
        body: (m.content || '').slice(0, 80),
        created_at: m.created_at,
        read: readIds.includes(`mention-${m.id}`),
      })
    })
    }

    // Announcements
    if (prefs.announcements) {
    ;(annRes.data || []).forEach((a: any) => {
      items.push({
        id: `ann-${a.id}`,
        type: 'announcement',
        title: a.title,
        body: (a.content || '').slice(0, 80),
        created_at: a.created_at,
        read: readIds.includes(`ann-${a.id}`),
      })
    })
    }

    // Todos
    if (prefs.todos) {
    ;(todoRes.data || []).forEach((t: any) => {
      items.push({
        id: `todo-${t.id}`,
        type: 'todo',
        title: 'Nouvelle tâche',
        body: t.title,
        created_at: t.created_at,
        read: readIds.includes(`todo-${t.id}`),
      })
    })
    }

    // Creativity feedback
    if (prefs.creativity) {
    ;(creativityRes.data || []).forEach((c: any) => {
      items.push({
        id: `creativity-${c.id}`,
        type: 'creativity',
        title: `Feedback sur "${c.title}"`,
        body: (c.feedback || '').slice(0, 80),
        created_at: c.created_at,
        read: readIds.includes(`creativity-${c.id}`),
      })
    })
    }

    // Sort by date desc
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setNotifications(items)
    setLoading(false)
    } catch (err) {
      console.error('[NOTIFICATIONS] fetchNotifications error:', err)
      setLoading(false)
    }
  }, [studentId, studentName, groupIds])

  useEffect(() => {
    fetchNotifications()

    // Real-time: listen for new messages, announcements in user's groups
    if (!groupIds.length) return

    const msgChannel = supabase
      .channel('notif-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=in.(${groupIds.join(',')})`,
      }, (payload: any) => {
        const msg = payload.new
        if (msg.content && msg.content.includes(`@${studentName}`)) {
          const readIds: string[] = JSON.parse(localStorage.getItem('notif_read') || '[]')
          const notifTitle = `${msg.sender_name || 'Quelqu\'un'} vous a mentionné`
          const notifBody = (msg.content || '').slice(0, 80)
          setNotifications(prev => [{
            id: `mention-${msg.id}`,
            type: 'mention',
            title: notifTitle,
            body: notifBody,
            created_at: msg.created_at,
            read: readIds.includes(`mention-${msg.id}`),
          }, ...prev])
          sendNativeNotification(notifTitle, notifBody)
        }
      })
      .subscribe()

    const annChannel = supabase
      .channel('notif-announcements')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_announcements',
        filter: `group_id=in.(${groupIds.join(',')})`,
      }, (payload: any) => {
        const ann = payload.new
        const notifTitle = ann.title || 'Nouvelle annonce'
        const notifBody = (ann.content || '').slice(0, 80)
        setNotifications(prev => [{
          id: `ann-${ann.id}`,
          type: 'announcement',
          title: notifTitle,
          body: notifBody,
          created_at: ann.created_at,
          read: false,
        }, ...prev])
        sendNativeNotification(notifTitle, notifBody)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(annChannel)
    }
  }, [fetchNotifications, groupIds, studentName])

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    updateBadge(unreadCount)
  }, [unreadCount])

  const markAllRead = useCallback(() => {
    const ids = notifications.map(n => n.id)
    localStorage.setItem('notif_read', JSON.stringify(ids))
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [notifications])

  const markRead = useCallback((id: string) => {
    const readIds: string[] = JSON.parse(localStorage.getItem('notif_read') || '[]')
    if (!readIds.includes(id)) {
      readIds.push(id)
      localStorage.setItem('notif_read', JSON.stringify(readIds))
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  return { notifications, unreadCount, loading, markAllRead, markRead, refresh: fetchNotifications }
}
