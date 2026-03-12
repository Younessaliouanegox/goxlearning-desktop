import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function usePresence(groupId: string | undefined, userId: string, userName: string) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!groupId) return

    const channel = supabase.channel(`presence:${groupId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string }>()
        const ids = new Set<string>()
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.userId) ids.add(p.userId)
          })
        })
        setOnlineUsers(ids)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, name: userName })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, userId, userName])

  const isOnline = (uid: string) => onlineUsers.has(uid)

  return { onlineUsers, isOnline }
}
