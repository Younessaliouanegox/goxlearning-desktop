import { useState, useCallback } from 'react'

const STORAGE_KEY = 'gox-notif-prefs'

export interface NotifPrefs {
  all: boolean
  mentions: boolean
  announcements: boolean
  todos: boolean
  creativity: boolean
  sound: boolean
  native: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  all: true,
  mentions: true,
  announcements: true,
  todos: true,
  creativity: true,
  sound: true,
  native: true,
}

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function useNotifPrefs() {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadPrefs)

  const update = useCallback((key: keyof NotifPrefs, value: boolean) => {
    setPrefs(prev => {
      let next: NotifPrefs

      if (key === 'all') {
        // Toggle all at once
        next = {
          all: value,
          mentions: value,
          announcements: value,
          todos: value,
          creativity: value,
          sound: value,
          native: value,
        }
      } else {
        next = { ...prev, [key]: value }
        // If any individual is off, set all to false; if all individual are on, set all to true
        const individual = [next.mentions, next.announcements, next.todos, next.creativity]
        next.all = individual.every(Boolean)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { prefs, update }
}

// Static getter for use outside React (e.g. in useNotifications)
export function getNotifPrefs(): NotifPrefs {
  return loadPrefs()
}
