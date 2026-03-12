import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { uploadToR2 } from '../upload'
import type { Todo } from '../../types'

export function useTodos(studentId: string | undefined, groupId: string | undefined) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('student_todos')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    setTodos(data || [])
    setLoading(false)
  }, [groupId])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const toggleTodo = async (todo: Todo) => {
    const newVal = !todo.is_completed
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_completed: newVal } : t))
    )
    await supabase
      .from('student_todos')
      .update({ is_completed: newVal })
      .eq('id', todo.id)
  }

  const addTodo = async (title: string, description: string | null, file?: File) => {
    if (!title.trim() || !studentId || !groupId) return

    let fileUrl: string | null = null
    let fileType: string | null = null

    if (file) {
      fileUrl = await uploadToR2(file, 'todos')
      fileType = file.type || null
    }

    const { data } = await supabase
      .from('student_todos')
      .insert({
        student_id: studentId,
        group_id: groupId,
        title: title.trim(),
        description: description?.trim() || null,
        file_url: fileUrl,
        file_type: fileType,
      })
      .select()
      .single()

    if (data) setTodos((prev) => [data, ...prev])
  }

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('student_todos').delete().eq('id', id)
  }

  const completedCount = todos.filter((t) => t.is_completed).length

  return { todos, loading, toggleTodo, addTodo, deleteTodo, completedCount }
}
