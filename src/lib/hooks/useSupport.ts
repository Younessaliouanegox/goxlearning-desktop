import { useState, useCallback } from 'react'

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:3000'

export interface AiMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
  ticketId?: string | null
  escalated?: boolean
}

export function useSupport(studentId: string | undefined) {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [sending, setSending] = useState(false)
  const loading = false // No initial loading for AI chat

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !studentId || sending) return

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setSending(true)

    try {
      // Build history for context (last 10 messages)
      const history = [...messages, userMsg].slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch(`${PORTAL_URL}/api/support-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          studentId,
          history,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || `Erreur ${res.status}`)
      }

      const data = await res.json()

      const aiMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.reply,
        timestamp: new Date().toISOString(),
        escalated: data.escalated || false,
        ticketId: data.ticketId || null,
      }

      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      const errorMsg: AiMessage = {
        id: `err-${Date.now()}`,
        role: 'ai',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
      console.error('[support-ai] Error:', err)
    } finally {
      setSending(false)
    }
  }, [studentId, sending, messages])

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, loading, sending, sendMessage, clearChat }
}
