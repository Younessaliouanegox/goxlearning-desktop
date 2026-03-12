import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import type { Announcement } from '../../types'

interface NewAnnouncement {
  title: string
  content: string
  priority: 'normal' | 'important' | 'urgent'
  pinned?: boolean
  image_url?: string | null
}

export function useAnnouncements(groupId: string | undefined) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAnnouncements = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('group_announcements')
      .select('*, members(name)')
      .eq('group_id', groupId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    setAnnouncements(
      (data || []).map((a: any) => ({
        ...a,
        member_name: a.members?.name || 'Admin',
      }))
    )
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  // Realtime
  useEffect(() => {
    if (!groupId) return
    const channel = supabase
      .channel(`announcements-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_announcements',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchAnnouncements()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, fetchAnnouncements])

  const addAnnouncement = async (memberId: string, announcement: NewAnnouncement) => {
    if (!groupId) return
    const { error } = await supabase
      .from('group_announcements')
      .insert({
        group_id: groupId,
        member_id: memberId,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        pinned: announcement.pinned || false,
        image_url: announcement.image_url || null,
      })
    if (error) console.error('[ANNONCES] Insert error:', error.message)
  }

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    const { error } = await supabase.from('group_announcements').delete().eq('id', id)
    if (error) console.error('[ANNONCES] Delete error:', error.message)
  }

  return { announcements, loading, addAnnouncement, deleteAnnouncement }
}
