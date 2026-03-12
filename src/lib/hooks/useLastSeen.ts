import { useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const UPDATE_INTERVAL = 60 * 1000 // Update every 60 seconds

/**
 * Tracks the current user's last_seen timestamp in the students table.
 * Also provides a utility to format relative time strings.
 */
export function useLastSeen(studentId: string | undefined) {
  const updateLastSeen = useCallback(async () => {
    if (!studentId) return
    await supabase
      .from('students')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', studentId)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return

    // Update immediately
    updateLastSeen()

    // Then every 60 seconds
    const interval = setInterval(updateLastSeen, UPDATE_INTERVAL)

    // Also update on window focus
    const onFocus = () => updateLastSeen()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [studentId, updateLastSeen])
}

/**
 * Format a last_seen ISO timestamp into a relative French string.
 */
export function formatLastSeen(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Jamais connecté'

  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then

  if (diffMs < 0 || diffMs < 2 * 60 * 1000) return 'En ligne'

  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 60) return `Il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`

  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
