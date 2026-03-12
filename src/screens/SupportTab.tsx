import React, { useEffect, useRef, useState } from 'react'
import {
  Sparkles, Send, RotateCcw, Ticket, Zap, BookOpen,
  CreditCard, HelpCircle, Loader2, Copy,
} from 'lucide-react'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'

const GOX_ICON = '/gox-icon.svg'
import { useSupport, AiMessage } from '../lib/hooks/useSupport'
import type { Student } from '../types'

interface SupportTabProps {
  student: Student
}

const SUGGESTIONS = [
  { icon: HelpCircle, label: 'Comment accéder à mon cours ?', color: '#3b82f6' },
  { icon: BookOpen, label: 'Quand est ma prochaine séance ?', color: '#8b5cf6' },
  { icon: CreditCard, label: "J'ai un problème de paiement", color: '#059669' },
  { icon: Zap, label: 'La plateforme ne fonctionne pas', color: '#f59e0b' },
]

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function SupportTab({ student }: SupportTabProps) {
  const { messages, sending, sendMessage, clearChat } = useSupport(student.id)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const handleMsgCtx = (e: React.MouseEvent, m: AiMessage) => {
    e.preventDefault()
    setCtxMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Copier le message', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(m.content) },
      ],
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = () => {
    if (!input.trim() || sending) return
    sendMessage(input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  const handleSuggestion = (text: string) => {
    sendMessage(text)
  }

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiAvatar}>
            <img src={GOX_ICON} alt="" style={{ width: 36, height: 36 }} />
            <div style={styles.onlineDot} />
          </div>
          <div>
            <div style={styles.headerTitle}>
              GoxLearning AI Support
              <Sparkles size={12} style={{ color: '#f59e0b', marginLeft: 4 }} />
            </div>
            <div style={styles.headerSub}>
              {sending ? 'En train de répondre...' : 'Support intelligent propulsé par IA'}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button style={styles.clearBtn} onClick={clearChat} title="Nouvelle conversation">
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={styles.messageArea}>
        {messages.length === 0 && !sending ? (
          <WelcomeScreen studentName={student.name} onSuggestion={handleSuggestion} />
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} studentName={student.name} onContextMenu={(e) => handleMsgCtx(e, m)} />
            ))}
            {sending && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {/* Input */}
      <div style={styles.inputBar}>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="Décrivez votre problème..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={sending}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: !input.trim() || sending ? 0.4 : 1,
          }}
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}

/* ── Welcome Screen ── */
function WelcomeScreen({ studentName, onSuggestion }: { studentName: string; onSuggestion: (t: string) => void }) {
  const firstName = studentName.split(' ')[0]
  return (
    <div style={styles.welcome}>
      <div style={styles.welcomeIcon}>
        <img src={GOX_ICON} alt="" style={{ width: 52, height: 52 }} />
      </div>
      <div style={styles.welcomeTitle}>Bonjour {firstName} !</div>
      <div style={styles.welcomeSub}>
        Je suis l'assistant IA de GoxLearning. Je peux vous aider avec vos cours,
        vos problèmes techniques, paiements et plus encore.
      </div>
      <div style={styles.welcomeNote}>
        Si je ne peux pas résoudre votre problème, j'ouvrirai automatiquement un ticket
        pour notre équipe.
      </div>
      <div style={styles.suggestionsGrid}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} style={styles.suggestionCard} onClick={() => onSuggestion(s.label)}>
            <div style={{ ...styles.suggestionIcon, background: s.color + '15', color: s.color }}>
              <s.icon size={15} />
            </div>
            <span style={styles.suggestionText}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Message Bubble ── */
function MessageBubble({ message, studentName, onContextMenu }: { message: AiMessage; studentName: string; onContextMenu?: (e: React.MouseEvent) => void }) {
  const isUser = message.role === 'user'

  return (
    <div style={{ ...styles.msgRow, justifyContent: isUser ? 'flex-end' : 'flex-start' }} onContextMenu={onContextMenu}>
      {!isUser && (
        <div style={styles.msgAiIcon}>
          <img src={GOX_ICON} alt="" style={{ width: 24, height: 24 }} />
        </div>
      )}
      <div style={{
        ...styles.msgBubble,
        ...(isUser ? styles.msgUser : styles.msgAi),
      }}>
        {!isUser && <div style={styles.msgSender}>GoxLearning AI Support</div>}
        <div style={styles.msgContent}>{message.content}</div>
        {message.escalated && message.ticketId && (
          <div style={styles.ticketBadge}>
            <Ticket size={12} />
            Ticket #{message.ticketId.slice(0, 8)} créé — Notre équipe va vous contacter
          </div>
        )}
        <div style={styles.msgTime}>{formatTime(message.timestamp)}</div>
      </div>
    </div>
  )
}

/* ── Typing Indicator ── */
function TypingIndicator() {
  return (
    <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
      <div style={styles.msgAiIcon}>
        <img src={GOX_ICON} alt="" style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ ...styles.msgBubble, ...styles.msgAi, padding: '12px 16px' }}>
        <div style={styles.typingDots}>
          <span style={{ ...styles.dot, animationDelay: '0s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.15s' }} />
          <span style={{ ...styles.dot, animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-main)',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  aiAvatar: {
    position: 'relative' as any,
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  onlineDot: {
    position: 'absolute' as any,
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#22c55e',
    border: '2px solid var(--bg-card)',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 1,
  },
  clearBtn: {
    background: 'var(--bg-muted)',
    border: '1px solid var(--border-light)',
    borderRadius: 8,
    padding: 6,
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
  },

  // Message area
  messageArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
  },

  // Welcome
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 0',
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    textAlign: 'center' as any,
    maxWidth: 360,
    lineHeight: '18px',
    marginBottom: 8,
  },
  welcomeNote: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    textAlign: 'center' as any,
    maxWidth: 320,
    lineHeight: '16px',
    padding: '6px 12px',
    background: 'var(--bg-muted)',
    borderRadius: 8,
    marginBottom: 20,
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    width: '100%',
    maxWidth: 400,
  },
  suggestionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    textAlign: 'left' as any,
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: '15px',
  },

  // Messages
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgAiIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgBubble: {
    maxWidth: '75%',
    borderRadius: 14,
    padding: '10px 14px',
  },
  msgUser: {
    background: 'var(--brand)',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  msgAi: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderBottomLeftRadius: 4,
  },
  msgSender: {
    fontSize: 10,
    fontWeight: 700,
    color: '#8b5cf6',
    marginBottom: 3,
  },
  msgContent: {
    fontSize: 13,
    lineHeight: '20px',
    whiteSpace: 'pre-wrap' as any,
    wordBreak: 'break-word' as any,
  },
  msgTime: {
    fontSize: 9,
    opacity: 0.5,
    marginTop: 4,
    textAlign: 'right' as any,
  },
  ticketBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: '#fef3c7',
    color: '#92400e',
    fontSize: 10,
    fontWeight: 700,
    lineHeight: '14px',
  },

  // Typing
  typingDots: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    height: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
    animation: 'dotPulse 1s ease-in-out infinite',
    display: 'inline-block',
  },

  // Input
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderTop: '1px solid var(--border-light)',
    background: 'var(--bg-card)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-muted)',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
}
