import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

interface AttendanceRecord {
  session_id: string
  student_id: string
  marked_at: string
}

export function useAttendance(sessionId: string | undefined, studentId: string | undefined) {
  const [isPresent, setIsPresent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState(0)

  const fetch = useCallback(async () => {
    if (!sessionId) return

    // Get count of attendees
    const { count } = await supabase
      .from('session_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    setAttendeeCount(count ?? 0)

    // Check if current student already marked
    if (studentId) {
      const { data } = await supabase
        .from('session_attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle()

      setIsPresent(!!data)
    }
  }, [sessionId, studentId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const markPresent = useCallback(async () => {
    if (!sessionId || !studentId || isPresent) return
    setLoading(true)
    const { error } = await supabase
      .from('session_attendance')
      .insert({ session_id: sessionId, student_id: studentId })

    if (!error) {
      setIsPresent(true)
      setAttendeeCount(prev => prev + 1)
    }
    setLoading(false)
  }, [sessionId, studentId, isPresent])

  return { isPresent, loading, attendeeCount, markPresent, refresh: fetch }
}

/**
 * Batch fetch attendance counts for multiple sessions.
 */
export function useSessionAttendance(sessionIds: string[], studentId: string | undefined) {
  const [attendance, setAttendance] = useState<Record<string, { count: number; present: boolean }>>({})

  useEffect(() => {
    if (!sessionIds.length) return

    const fetchAll = async () => {
      // Fetch all attendance records for these sessions
      const { data } = await supabase
        .from('session_attendance')
        .select('session_id, student_id')
        .in('session_id', sessionIds)

      if (!data) return

      const map: Record<string, { count: number; present: boolean }> = {}
      for (const id of sessionIds) {
        const entries = data.filter(d => d.session_id === id)
        map[id] = {
          count: entries.length,
          present: !!studentId && entries.some(e => e.student_id === studentId),
        }
      }
      setAttendance(map)
    }

    fetchAll()
  }, [sessionIds.join(','), studentId])

  const markPresent = async (sessionId: string) => {
    if (!studentId) return
    const { error } = await supabase
      .from('session_attendance')
      .insert({ session_id: sessionId, student_id: studentId })

    if (!error) {
      setAttendance(prev => ({
        ...prev,
        [sessionId]: {
          count: (prev[sessionId]?.count ?? 0) + 1,
          present: true,
        },
      }))
    }
  }

  return { attendance, markPresent }
}
