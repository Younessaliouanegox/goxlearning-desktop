import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import type { Group } from '../../types'

// Roles from portal DB: 'Admin', 'Confirmation', 'Teacher', 'Support' (comma-separated for multi-role)
function hasRole(role: string | undefined, target: string): boolean {
  if (!role) return false
  return role.split(',').some(r => r.trim().toLowerCase() === target.toLowerCase())
}

function canSeeAllGroups(role: string | undefined): boolean {
  return hasRole(role, 'Admin') || hasRole(role, 'Support') || hasRole(role, 'Confirmation')
}

export function useGroups(userId: string | undefined, role?: string) {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchGroups()
  }, [userId, role])

  const fetchGroups = async () => {
    if (!userId) return
    setLoading(true)
    console.log('[GROUPS] userId:', userId, 'role:', role)

    const SELECT = 'id, name, image_url, description, telegram_link, drive_link, meet_link, courses(name)'

    // Admin / Support / Confirmation: fetch ALL groups
    if (canSeeAllGroups(role)) {
      console.log('[GROUPS] Full access role — fetching all groups')
      const { data, error } = await supabase
        .from('groups')
        .select(SELECT)
        .order('name')

      console.log('[GROUPS] All groups result:', data?.length, error?.message)
      const fetched = (data || []).map((g: any) => ({
        ...g,
        courses: Array.isArray(g.courses) ? g.courses[0] || null : g.courses,
      })) as Group[]

      setGroups(fetched)
      if (fetched.length > 0) setSelectedGroup(fetched[0])
      setLoading(false)
      return
    }

    // Teacher (Formateur): only groups they are assigned to
    if (hasRole(role, 'Teacher')) {
      console.log('[GROUPS] Teacher role — fetching assigned groups')
      const { data: memberGroups, error } = await supabase
        .from('groups')
        .select(SELECT)
        .or(`instructor_id.eq.${userId},member_id.eq.${userId}`)
        .order('name')

      console.log('[GROUPS] Teacher groups:', memberGroups?.length, error?.message)
      const fetched = (memberGroups || []).map((g: any) => ({
        ...g,
        courses: Array.isArray(g.courses) ? g.courses[0] || null : g.courses,
      })) as Group[]

      setGroups(fetched)
      if (fetched.length > 0) setSelectedGroup(fetched[0])
      setLoading(false)
      return
    }

    // Student: check enrollments
    console.log('[GROUPS] Student role — fetching enrolled groups')
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('group_id')
      .eq('student_id', userId)

    console.log('[GROUPS] Enrollments:', enrollments?.length, enrollErr?.message)

    if (!enrollments?.length) {
      setGroups([])
      setLoading(false)
      return
    }

    const groupIds = enrollments.map((e) => e.group_id)
    const { data, error } = await supabase
      .from('groups')
      .select(SELECT)
      .in('id', groupIds)
      .order('name')

    console.log('[GROUPS] Student groups:', data?.length, error?.message)
    const fetched = (data || []).map((g: any) => ({
      ...g,
      courses: Array.isArray(g.courses) ? g.courses[0] || null : g.courses,
    })) as Group[]

    setGroups(fetched)
    if (fetched.length > 0) setSelectedGroup(fetched[0])
    setLoading(false)
  }

  return { groups, selectedGroup, setSelectedGroup, loading }
}
