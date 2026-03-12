import { useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { getNotifPrefs } from './useNotifPrefs'

const REMINDER_KEY = 'gox-todo-reminded'
const CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

function getReminded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]'))
  } catch { return new Set() }
}

function addReminded(id: string) {
  const set = getReminded()
  set.add(id)
  // Keep only last 200 entries to avoid bloat
  const arr = [...set].slice(-200)
  localStorage.setItem(REMINDER_KEY, JSON.stringify(arr))
}

export function useTodoReminders(groupIds: string[]) {
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!groupIds.length) return

    const check = async () => {
      const prefs = getNotifPrefs()
      if (!prefs.all || !prefs.todos) return

      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const { data } = await supabase
        .from('student_todos')
        .select('id, title, due_date, is_completed, group_id')
        .eq('is_completed', false)
        .not('due_date', 'is', null)
        .in('group_id', groupIds)
        .lte('due_date', in24h.toISOString())
        .gte('due_date', now.toISOString())
        .order('due_date', { ascending: true })
        .limit(10)

      if (!data?.length) return

      const reminded = getReminded()

      for (const todo of data) {
        if (reminded.has(todo.id)) continue

        const due = new Date(todo.due_date!)
        const diffMs = due.getTime() - now.getTime()
        const diffH = Math.round(diffMs / (1000 * 60 * 60))
        const timeStr = diffH <= 1 ? 'moins d\'une heure' : `${diffH}h`

        window.electronAPI?.showNotification({
          title: '⏰ Rappel de tâche',
          body: `"${todo.title}" — échéance dans ${timeStr}`,
          tag: `todo-${todo.id}`,
        })

        addReminded(todo.id)
      }
    }

    // Check immediately then every 5 minutes
    check()
    timerRef.current = setInterval(check, CHECK_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [groupIds.join(',')])
}
