import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

interface TypingUser {
  userId: string
  name: string
}

export function useTypingIndicator(groupId: string | undefined, userId: string, userName: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!groupId) return

    const channel = supabase.channel(`typing:${groupId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string; name: string; typing: boolean }>()
        const users: TypingUser[] = []
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.typing && p.userId !== userId) {
              users.push({ userId: p.userId, name: p.name })
            }
          })
        })
        setTypingUsers(users)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [groupId, userId])

  const startTyping = useCallback(() => {
    if (!channelRef.current) return
    channelRef.current.track({ userId, name: userName, typing: true })

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      channelRef.current?.track({ userId, name: userName, typing: false })
    }, 3000)
  }, [userId, userName])

  const stopTyping = useCallback(() => {
    if (!channelRef.current) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    channelRef.current.track({ userId, name: userName, typing: false })
  }, [userId, userName])

  return { typingUsers, startTyping, stopTyping }
}
