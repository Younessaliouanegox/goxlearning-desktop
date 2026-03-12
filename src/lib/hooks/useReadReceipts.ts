import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

interface ReadState {
  [userId: string]: { name: string; lastReadMsgId: string }
}

export function useReadReceipts(groupId: string | undefined, userId: string, userName: string) {
  const [readState, setReadState] = useState<ReadState>({})
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!groupId) return

    const channel = supabase.channel(`read:${groupId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string; name: string; lastReadMsgId: string }>()
        const newReadState: ReadState = {}
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.userId && p.lastReadMsgId) {
              newReadState[p.userId] = { name: p.name, lastReadMsgId: p.lastReadMsgId }
            }
          })
        })
        setReadState(newReadState)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [groupId, userId])

  const markAsRead = useCallback((messageId: string) => {
    if (!channelRef.current || !messageId) return
    channelRef.current.track({ userId, name: userName, lastReadMsgId: messageId })
  }, [userId, userName])

  // Check if a message has been read by at least one other user
  const isReadByOthers = useCallback((messageId: string, allMessageIds: string[]) => {
    const msgIndex = allMessageIds.indexOf(messageId)
    if (msgIndex < 0) return false

    return Object.entries(readState).some(([uid, state]) => {
      if (uid === userId) return false
      const readIndex = allMessageIds.indexOf(state.lastReadMsgId)
      return readIndex >= msgIndex
    })
  }, [readState, userId])

  // Get list of names who have read up to (or past) a specific message
  const getReadBy = useCallback((messageId: string, allMessageIds: string[]): string[] => {
    const msgIndex = allMessageIds.indexOf(messageId)
    if (msgIndex < 0) return []

    return Object.entries(readState)
      .filter(([uid, state]) => {
        if (uid === userId) return false
        const readIndex = allMessageIds.indexOf(state.lastReadMsgId)
        return readIndex >= msgIndex
      })
      .map(([, state]) => state.name)
  }, [readState, userId])

  return { readState, markAsRead, isReadByOthers, getReadBy }
}
