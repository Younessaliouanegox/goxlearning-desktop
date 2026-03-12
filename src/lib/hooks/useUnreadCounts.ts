import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import type { Tab } from '../../types'

const STORAGE_KEY = 'gox-last-seen'

interface LastSeen {
  [groupTabKey: string]: number // timestamp of last visit
}

function getStoredLastSeen(): LastSeen {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function storeLastSeen(data: LastSeen) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useUnreadCounts(groupId: string | undefined) {
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({})

  const fetchCounts = useCallback(async () => {
    if (!groupId) { setCounts({}); return }

    const lastSeen = getStoredLastSeen()

    // Fetch unread chat messages
    const chatKey = `${groupId}:general`
    const chatLastSeen = lastSeen[chatKey] || 0
    const chatSince = new Date(chatLastSeen).toISOString()

    const [chatRes, annRes] = await Promise.all([
      supabase
        .from('group_messages')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gt('created_at', chatSince),
      supabase
        .from('group_announcements')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gt('created_at', new Date(lastSeen[`${groupId}:annonces`] || 0).toISOString()),
    ])

    setCounts({
      general: chatRes.count || 0,
      annonces: annRes.count || 0,
    })
  }, [groupId])

  useEffect(() => {
    fetchCounts()

    if (!groupId) return

    // Realtime refresh on new messages/announcements
    const channel = supabase
      .channel(`unread-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, () => fetchCounts())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_announcements', filter: `group_id=eq.${groupId}` }, () => fetchCounts())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, fetchCounts])

  const markTabSeen = useCallback((tab: Tab) => {
    if (!groupId) return
    const lastSeen = getStoredLastSeen()
    lastSeen[`${groupId}:${tab}`] = Date.now()
    storeLastSeen(lastSeen)
    setCounts(prev => ({ ...prev, [tab]: 0 }))
  }, [groupId])

  return { unreadCounts: counts, markTabSeen }
}
