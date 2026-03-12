import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { uploadToR2 } from '../upload'
import type { ChatMessage } from '../../types'

export function useChat(groupId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const enrichMessage = (m: any): ChatMessage => ({
    id: m.id,
    group_id: m.group_id,
    student_id: m.student_id,
    member_id: m.member_id,
    sender_type: m.sender_type || 'student',
    sender_name: m.sender_name || m.students?.name || m.members?.name || 'Utilisateur',
    sender_avatar_url: m.sender_avatar_url || m.students?.avatar_url || m.members?.avatar_url || null,
    sender_role: m.sender_role || m.members?.role || null,
    content: m.content,
    file_url: m.file_url || null,
    file_type: m.file_type || null,
    pinned: m.pinned || false,
    reactions: m.reactions || {},
    created_at: m.created_at,
  })

  const fetchMessages = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('group_messages')
      .select('*, students(name, avatar_url), members(name, avatar_url, role)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200)

    setMessages((data || []).map(enrichMessage))
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Realtime subscription — listen for INSERT and DELETE
  useEffect(() => {
    if (!groupId) return

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any
            let senderName = newMsg.sender_name
            if (!senderName) {
              if (newMsg.sender_type === 'member' && newMsg.member_id) {
                const { data } = await supabase.from('members').select('name, avatar_url, role').eq('id', newMsg.member_id).single()
                senderName = data?.name || 'Formateur'
                newMsg.sender_avatar_url = data?.avatar_url || null
                newMsg.sender_role = data?.role || null
              } else if (newMsg.student_id) {
                const { data } = await supabase.from('students').select('name, avatar_url').eq('id', newMsg.student_id).single()
                senderName = data?.name || 'Étudiant'
                newMsg.sender_avatar_url = data?.avatar_url || null
              }
            }
            setMessages((prev) => [...prev, enrichMessage({ ...newMsg, sender_name: senderName })])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any
            setMessages((prev) => prev.map((m) =>
              m.id === updated.id ? { ...m, content: updated.content } : m
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id
            if (deletedId) {
              setMessages((prev) => prev.filter((m) => m.id !== deletedId))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  // Send message with optional file
  const sendMessage = async (
    userId: string,
    content: string,
    senderType: 'student' | 'member' = 'student',
    senderName?: string,
    file?: File,
  ) => {
    if ((!content.trim() && !file) || !groupId) return
    const row: any = {
      group_id: groupId,
      content: content.trim(),
      sender_type: senderType,
      sender_name: senderName || null,
    }
    if (senderType === 'member') {
      row.member_id = userId
    } else {
      row.student_id = userId
    }
    if (file) {
      const url = await uploadToR2(file, 'chat')
      if (url) {
        row.file_url = url
        row.file_type = file.type
      }
    }
    await supabase.from('group_messages').insert(row)
  }

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return
    await supabase.from('group_messages').update({ content: newContent.trim() }).eq('id', messageId)
    setMessages((prev) => prev.map((m) =>
      m.id === messageId ? { ...m, content: newContent.trim() } : m
    ))
  }

  // Pin / Unpin message
  const pinMessage = async (messageId: string, pinned: boolean) => {
    await supabase.from('group_messages').update({ pinned }).eq('id', messageId)
    setMessages((prev) => prev.map((m) =>
      m.id === messageId ? { ...m, pinned } : m
    ))
  }

  // Toggle emoji reaction
  const toggleReaction = async (messageId: string, emoji: string, userId: string) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m
      const reactions = { ...(m.reactions || {}) }
      const users = reactions[emoji] ? [...reactions[emoji]] : []
      const idx = users.indexOf(userId)
      if (idx >= 0) users.splice(idx, 1)
      else users.push(userId)
      if (users.length === 0) delete reactions[emoji]
      else reactions[emoji] = users
      return { ...m, reactions }
    }))
    // Persist to DB
    const msg = messages.find(m => m.id === messageId)
    if (msg) {
      const reactions = { ...(msg.reactions || {}) }
      const users = reactions[emoji] ? [...reactions[emoji]] : []
      const idx = users.indexOf(userId)
      if (idx >= 0) users.splice(idx, 1)
      else users.push(userId)
      if (users.length === 0) delete reactions[emoji]
      else reactions[emoji] = users
      await supabase.from('group_messages').update({ reactions }).eq('id', messageId)
    }
  }

  // Forward message to another group
  const forwardMessage = async (
    targetGroupId: string,
    content: string,
    userId: string,
    senderType: 'student' | 'member',
    senderName: string,
    fileUrl?: string | null,
    fileType?: string | null,
  ) => {
    const row: any = {
      group_id: targetGroupId,
      content: content || '',
      sender_type: senderType,
      sender_name: senderName,
    }
    if (senderType === 'member') row.member_id = userId
    else row.student_id = userId
    if (fileUrl) { row.file_url = fileUrl; row.file_type = fileType }
    await supabase.from('group_messages').insert(row)
  }

  // Delete message
  const deleteMessage = async (messageId: string) => {
    await supabase.from('group_messages').delete().eq('id', messageId)
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  return { messages, loading, sendMessage, editMessage, pinMessage, toggleReaction, forwardMessage, deleteMessage }
}
