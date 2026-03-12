import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { uploadToR2 } from '../upload'
import type { CreativityUpload } from '../../types'

export function useCreativity(groupId: string | undefined, studentId: string | undefined, role?: string) {
  const [uploads, setUploads] = useState<CreativityUpload[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUploads = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('creativity_uploads')
      .select('*, students(name), members(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    setUploads(
      (data || []).map((u: any) => ({
        ...u,
        student_name: u.students?.name || u.members?.name || 'Utilisateur',
      }))
    )
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  // Realtime
  useEffect(() => {
    if (!groupId) return
    const channel = supabase
      .channel(`creativity-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creativity_uploads',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchUploads()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, fetchUploads])

  const addUpload = async (title: string, description: string | null, file?: File | null) => {
    if (!title.trim() || !groupId || !studentId) return
    let fileUrl: string | null = null
    let fileType: string | null = null
    if (file) {
      const url = await uploadToR2(file, 'creativity')
      if (url) {
        fileUrl = url
        fileType = file.type
      }
    }
    const isMember = !!role
    const row: any = {
      group_id: groupId,
      title: title.trim(),
      description: description?.trim() || null,
      file_url: fileUrl,
      file_type: fileType,
    }
    if (isMember) {
      row.member_id = studentId
    } else {
      row.student_id = studentId
    }
    await supabase.from('creativity_uploads').insert(row)
  }

  const deleteUpload = async (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
    await supabase.from('creativity_uploads').delete().eq('id', id)
  }

  return { uploads, loading, addUpload, deleteUpload }
}
