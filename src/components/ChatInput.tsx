import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Send, Paperclip, X, Mic, Smile } from 'lucide-react'

interface ReplyPreview {
  id: string
  senderName: string
  content: string
}

interface MentionUser {
  id: string
  name: string
  avatar_url?: string | null
}

interface ChatInputProps {
  onSend: (text: string, file?: File) => void
  placeholder?: string
  replyTo?: ReplyPreview | null
  onCancelReply?: () => void
  members?: MentionUser[]
  onTyping?: () => void
  onStopTyping?: () => void
}

/* ── Emoji Data ── */
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Fréquents', emojis: ['😀','😂','❤️','👍','🔥','🎉','😍','🙏','💪','✅','👏','😊','🤣','💯','😎','🥳','😢','🤔','😮','🫡'] },
  { label: 'Visages', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🥳','🤠','🥸','😎','🤓','🧐','😤','😡','🤬','😈'] },
  { label: 'Gestes', emojis: ['👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪','✍️','🦾','🖕'] },
  { label: 'Coeurs', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { label: 'Objets', emojis: ['⭐','🌟','✨','💫','🔥','💥','🎉','🎊','🏆','🥇','🎯','💡','📌','📎','✏️','📝','📚','💻','📱','⚡','🔔','🚀','⏰','🎵','🎧'] },
  { label: 'Nature', emojis: ['🌸','🌹','🌺','🌻','🌼','🌷','🌱','🍀','🌲','🌴','🍁','🍂','🌊','☀️','🌈','⛅','❄️','🌙','⭐','🌍'] },
]

/* ── Component ── */
export default function ChatInput({ onSend, placeholder = 'Écrire un message...', replyTo, onCancelReply, members = [], onTyping, onStopTyping }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Emoji picker
  const [showEmoji, setShowEmoji] = useState(false)
  const [emojiCat, setEmojiCat] = useState(0)
  const emojiRef = useRef<HTMLDivElement>(null)

  // @mentions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIdx, setMentionIdx] = useState(0)
  const mentionRef = useRef<HTMLDivElement>(null)

  // Voice recording
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  // Filtered mentions
  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return members.filter(m => m.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mentionQuery, members])

  // Detect @mention while typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    if (val.trim()) onTyping?.()

    const pos = e.target.selectionStart || 0
    const textBefore = val.slice(0, pos)
    const atMatch = textBefore.match(/@(\w*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIdx(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (name: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart || 0
    const textBefore = input.slice(0, pos)
    const textAfter = input.slice(pos)
    const replaced = textBefore.replace(/@(\w*)$/, `@${name} `)
    setInput(replaced + textAfter)
    setMentionQuery(null)
    setTimeout(() => {
      ta.focus()
      const newPos = replaced.length
      ta.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const pos = ta.selectionStart || input.length
    const newVal = input.slice(0, pos) + emoji + input.slice(pos)
    setInput(newVal)
    setTimeout(() => {
      ta.focus()
      const newPos = pos + emoji.length
      ta.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const handleSend = () => {
    if (!input.trim() && !file) return
    onSend(input.trim(), file || undefined)
    setInput('')
    setFile(null)
    setMentionQuery(null)
    onStopTyping?.()
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionResults.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionResults.length) % mentionResults.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIdx].name); return }
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return }
    }

    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        onSend('', audioFile)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      console.error('Microphone access denied')
    }
  }, [onSend])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setRecordTime(0)
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = () => { mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop()) }
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setRecordTime(0)
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const hasContent = input.trim().length > 0 || !!file

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={styles.bar}>
      {/* Reply preview */}
      {replyTo && (
        <div style={styles.replyBar}>
          <div style={styles.replyLine} />
          <div style={styles.replyContent}>
            <div style={styles.replyName}>{replyTo.senderName}</div>
            <div style={styles.replyText}>{replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '...' : ''}</div>
          </div>
          <button style={styles.replyClose} onClick={onCancelReply}><X size={14} /></button>
        </div>
      )}

      {/* File preview */}
      {file && (
        <div style={styles.filePreview}>
          <span style={styles.fileName}>{file.name}</span>
          <button style={styles.replyClose} onClick={() => setFile(null)}><X size={14} /></button>
        </div>
      )}

      {/* @Mentions popup */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div style={styles.mentionPopup} ref={mentionRef}>
          {mentionResults.map((m, i) => (
            <button
              key={m.id}
              style={{
                ...styles.mentionItem,
                background: i === mentionIdx ? 'var(--brand-light)' : 'transparent',
              }}
              onClick={() => insertMention(m.name)}
              onMouseEnter={() => setMentionIdx(i)}
            >
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" style={styles.mentionAvatar} />
              ) : (
                <div style={styles.mentionAvatarFallback}>{getInitials(m.name)}</div>
              )}
              <span style={styles.mentionName}>{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={styles.emojiPicker} ref={emojiRef}>
          <div style={styles.emojiTabs}>
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                style={{
                  ...styles.emojiTab,
                  color: i === emojiCat ? 'var(--brand)' : 'var(--text-tertiary)',
                  borderBottom: i === emojiCat ? '2px solid var(--brand)' : '2px solid transparent',
                }}
                onClick={() => setEmojiCat(i)}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>
          <div style={styles.emojiGrid}>
            {EMOJI_CATEGORIES[emojiCat].emojis.map((e, i) => (
              <button key={i} style={styles.emojiBtn} onClick={() => insertEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div style={styles.inputRow}>
        {recording ? (
          <>
            <button style={styles.cancelRecBtn} onClick={cancelRecording}>
              <X size={16} />
            </button>
            <div style={styles.recordingIndicator}>
              <div style={styles.recordDot} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)' }}>
                {formatTime(recordTime)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Enregistrement...</span>
            </div>
            <button style={styles.stopRecBtn} onClick={stopRecording}>
              <Send size={15} />
            </button>
          </>
        ) : (
          <>
            <button style={styles.iconBtn} onClick={() => fileRef.current?.click()} title="Joindre un fichier">
              <Paperclip size={16} />
            </button>
            <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />

            <button style={styles.iconBtn} onClick={() => setShowEmoji(!showEmoji)} title="Emojis">
              <Smile size={16} />
            </button>

            <textarea
              ref={textareaRef}
              style={styles.textarea}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
            />

            {hasContent ? (
              <button
                style={{ ...styles.sendBtn, background: 'var(--brand)', color: '#fff' }}
                onClick={handleSend}
              >
                <Send size={15} />
              </button>
            ) : (
              <button
                style={{ ...styles.sendBtn, background: 'var(--bg-muted)', color: 'var(--text-tertiary)' }}
                onClick={startRecording}
                title="Message vocal"
              >
                <Mic size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Shortcuts hint */}
      {input.length > 0 && !recording && (
        <div style={styles.hints}>
          <span><strong>Entrée</strong> envoyer</span>
          <span><strong>Shift+Entrée</strong> nouvelle ligne</span>
          <span><strong>@</strong> mentionner</span>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    borderTop: '1px solid var(--border-light)',
    position: 'relative' as any,
  },
  replyBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px 0',
  },
  replyLine: {
    width: 3,
    height: 28,
    borderRadius: 3,
    background: 'var(--brand)',
    flexShrink: 0,
  },
  replyContent: {
    flex: 1,
    minWidth: 0,
  },
  replyName: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--brand)',
  },
  replyText: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  replyClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  filePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px 0',
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--brand)',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    padding: '10px 12px',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  textarea: {
    flex: 1,
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none' as any,
    lineHeight: '18px',
    minHeight: 38,
    maxHeight: 120,
    overflowY: 'auto' as any,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  hints: {
    display: 'flex',
    gap: 14,
    padding: '0 20px 6px',
    fontSize: 10,
    color: 'var(--text-tertiary)',
  },

  // @Mentions
  mentionPopup: {
    position: 'absolute' as any,
    bottom: '100%',
    left: 16,
    right: 16,
    maxHeight: 220,
    overflowY: 'auto' as any,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    boxShadow: '0 -4px 20px rgba(0,0,0,.1)',
    padding: '4px 0',
    zIndex: 100,
  },
  mentionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 14px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left' as any,
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    transition: 'background 0.1s',
  },
  mentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    objectFit: 'cover' as any,
    flexShrink: 0,
  },
  mentionAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'var(--brand-light)',
    color: 'var(--brand)',
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mentionName: {
    fontWeight: 600,
  },

  // Emoji picker
  emojiPicker: {
    position: 'absolute' as any,
    bottom: '100%',
    left: 50,
    width: 320,
    maxHeight: 280,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 14,
    boxShadow: '0 -4px 24px rgba(0,0,0,.12)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column' as any,
    overflow: 'hidden',
  },
  emojiTabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-light)',
    padding: '0 4px',
    flexShrink: 0,
  },
  emojiTab: {
    flex: 1,
    padding: '8px 0',
    fontSize: 16,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.1s',
    fontFamily: 'inherit',
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 2,
    padding: 8,
    overflowY: 'auto' as any,
    flex: 1,
  },
  emojiBtn: {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    background: 'none',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },

  // Recording
  recordingIndicator: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--error)',
    animation: 'pulse 1s ease infinite',
    flexShrink: 0,
  },
  cancelRecBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: 'none',
    background: 'var(--error-bg)',
    color: 'var(--error)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stopRecBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: 'none',
    background: 'var(--brand)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}
