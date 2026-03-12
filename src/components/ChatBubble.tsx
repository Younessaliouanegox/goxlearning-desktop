import React, { useState, useRef, useEffect } from 'react'
import { Pin, Play, Pause, Check, CheckCheck } from 'lucide-react'

interface ReplyInfo {
  id: string
  senderName: string
  content: string
}

interface ChatBubbleProps {
  content: string
  time: string
  isMe: boolean
  senderName?: string
  senderRole?: string
  senderAvatarUrl?: string | null
  variant?: 'group' | 'support'
  fileUrl?: string | null
  fileType?: string | null
  pinned?: boolean
  reactions?: Record<string, string[]>
  replyTo?: ReplyInfo | null
  searchQuery?: string
  showReactionPicker?: boolean
  readStatus?: 'sent' | 'read'
  readByNames?: string[]
  isOnline?: boolean
  onContextMenu?: (e: React.MouseEvent) => void
  onReplyClick?: (replyId: string) => void
  onReaction?: (emoji: string) => void
  onImageClick?: (src: string) => void
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getRoleLabel(role?: string) {
  if (!role || role === 'student') return 'Étudiant'
  const r = role.toLowerCase().split(',')[0].trim()
  switch (r) {
    case 'admin': return 'Admin'
    case 'teacher': case 'instructor': return 'Formateur'
    case 'support': return 'Support'
    case 'confirmation': return 'Confirmation'
    case 'member': return 'Staff'
    default: return 'Staff'
  }
}

function getRoleBadgeColor(role?: string) {
  if (!role || role === 'student') return { bg: 'rgba(0,188,212,.12)', color: '#00bcd4' }
  const r = role.toLowerCase().split(',')[0].trim()
  switch (r) {
    case 'admin': return { bg: 'rgba(239,68,68,.12)', color: '#ef4444' }
    case 'teacher': case 'instructor': return { bg: 'rgba(139,92,246,.12)', color: '#8b5cf6' }
    case 'support': return { bg: 'rgba(34,197,94,.12)', color: '#22c55e' }
    default: return { bg: 'rgba(107,114,128,.12)', color: '#6b7280' }
  }
}

function highlightText(text: string, query: string) {
  if (!query || query.length < 2) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
      : part
  )
}

export default function ChatBubble({
  content, time, isMe, senderName, senderRole, senderAvatarUrl, variant = 'group',
  fileUrl, fileType, pinned, reactions, replyTo, searchQuery,
  showReactionPicker, readStatus, readByNames, isOnline, onContextMenu, onReplyClick, onReaction, onImageClick,
}: ChatBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const [showSeenBy, setShowSeenBy] = useState(false)
  const seenByRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    if (!showSeenBy) return
    const handleClick = (e: MouseEvent) => {
      if (seenByRef.current && !seenByRef.current.contains(e.target as Node)) {
        setShowSeenBy(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSeenBy])

  const formattedTime = new Date(time).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isMember = variant === 'support' || !!senderRole
  const avatarBg = isMember ? 'var(--purple)' : 'var(--brand)'
  const isImage = fileUrl && fileType?.startsWith('image')
  const isAudio = fileUrl && (fileType?.startsWith('audio') || fileUrl.endsWith('.webm') || fileUrl.endsWith('.ogg'))
  const isFile = fileUrl && !isImage && !isAudio

  const reactionEntries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0)

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) return
    if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false) }
    else { audioRef.current.playbackRate = playbackRate; audioRef.current.play(); setAudioPlaying(true) }
  }

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation()
    const speeds = [1, 1.5, 2]
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
    setPlaybackRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      style={{
        ...styles.row,
        flexDirection: isMe ? 'row-reverse' : 'row',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
      }}
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => { setHovered(false) }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e) }}
    >
      {/* Avatar */}
      {senderName && (
        <div style={{ position: 'relative' as any, flexShrink: 0 }}>
          {senderAvatarUrl ? (
            <img src={senderAvatarUrl} alt="" style={{ ...styles.avatar, objectFit: 'cover' as any }} />
          ) : (
            <div style={{ ...styles.avatar, background: avatarBg }}>
              {getInitials(senderName)}
            </div>
          )}
          {isOnline && <div style={styles.onlineDot} />}
        </div>
      )}

      <div style={{
        ...styles.bubbleWrap,
        alignItems: isMe ? 'flex-end' : 'flex-start',
      }}>
        {/* Bubble */}
        <div style={{ position: 'relative' as any }}>
          <div style={{
            ...styles.bubble,
            ...(isMe ? styles.bubbleMe : (isMember ? styles.bubbleSupport : styles.bubbleOther)),
          }}>
            {/* Name inside bubble */}
            {senderName && !isMe && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  ...styles.senderName,
                  color: isMember ? 'var(--purple)' : '#00bcd4',
                  marginBottom: 0,
                }}>
                  {senderName}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: getRoleBadgeColor(senderRole).bg,
                  color: getRoleBadgeColor(senderRole).color,
                  letterSpacing: 0.3,
                  lineHeight: '16px',
                  whiteSpace: 'nowrap' as any,
                }}>
                  {getRoleLabel(senderRole)}
                </span>
              </div>
            )}

            {/* Pinned indicator */}
            {pinned && (
              <div style={styles.pinnedBadge}>
                <Pin size={10} /> Épinglé
              </div>
            )}

            {/* Reply quote */}
            {replyTo && (
              <div
                style={{
                  ...styles.replyQuote,
                  borderLeftColor: isMe ? 'rgba(255,255,255,.5)' : 'var(--brand)',
                  cursor: onReplyClick ? 'pointer' : 'default',
                }}
                onClick={() => onReplyClick?.(replyTo.id)}
              >
                <div style={{ ...styles.replyName, color: isMe ? 'rgba(255,255,255,.8)' : 'var(--brand)' }}>
                  {replyTo.senderName}
                </div>
                <div style={{ ...styles.replyText, color: isMe ? 'rgba(255,255,255,.6)' : 'var(--text-tertiary)' }}>
                  {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? '...' : ''}
                </div>
              </div>
            )}

            {/* Image */}
            {isImage && (
              <img src={fileUrl!} alt="" style={styles.msgImage} onClick={() => onImageClick ? onImageClick(fileUrl!) : window.open(fileUrl!, '_blank')} />
            )}

            {/* Voice message */}
            {isAudio && (
              <div style={styles.voiceRow}>
                <button
                  onClick={toggleAudio}
                  style={{
                    ...styles.voicePlayBtn,
                    background: isMe ? 'rgba(255,255,255,.2)' : 'var(--brand-light)',
                    color: isMe ? '#fff' : 'var(--brand)',
                  }}
                >
                  {audioPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as any, gap: 3, minWidth: 80 }}>
                  <div style={styles.voiceWave}>
                    {[...Array(24)].map((_, i) => {
                      const barProgress = i / 24
                      const isPlayed = barProgress < audioProgress
                      return (
                        <div key={i} style={{
                          width: 2,
                          height: 4 + Math.sin(i * 0.7) * 8 + Math.cos(i * 1.3) * 4,
                          borderRadius: 1,
                          background: isMe
                            ? (isPlayed ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.3)')
                            : (isPlayed ? 'var(--brand)' : 'rgba(26,35,126,.2)'),
                          transition: 'background 0.15s ease',
                        }} />
                      )
                    })}
                  </div>
                  <span style={{
                    fontSize: 10,
                    color: isMe ? 'rgba(255,255,255,.5)' : 'var(--text-tertiary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {audioPlaying || audioCurrentTime > 0
                      ? `${formatTime(audioCurrentTime)} / ${formatTime(audioDuration)}`
                      : audioDuration > 0 ? formatTime(audioDuration) : '0:00'
                    }
                  </span>
                </div>
                <button
                  onClick={cycleSpeed}
                  style={{
                    ...styles.speedBtn,
                    color: isMe ? 'rgba(255,255,255,.7)' : 'var(--text-secondary)',
                    background: isMe ? 'rgba(255,255,255,.1)' : 'var(--bg-muted)',
                  }}
                  title="Vitesse de lecture"
                >
                  {playbackRate}x
                </button>
                <audio
                  ref={audioRef}
                  src={fileUrl!}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setAudioDuration(audioRef.current.duration)
                  }}
                  onTimeUpdate={() => {
                    if (audioRef.current && audioRef.current.duration) {
                      setAudioCurrentTime(audioRef.current.currentTime)
                      setAudioProgress(audioRef.current.currentTime / audioRef.current.duration)
                    }
                  }}
                  onEnded={() => { setAudioPlaying(false); setAudioProgress(0); setAudioCurrentTime(0) }}
                />
              </div>
            )}

            {/* File */}
            {isFile && (
              <a href={fileUrl!} target="_blank" rel="noreferrer" style={{
                ...styles.fileLink,
                color: isMe ? '#fff' : 'var(--brand)',
              }}>
                {fileUrl!.split('/').pop()?.slice(0, 30) || 'Fichier'}
              </a>
            )}

            {/* Text + time inline */}
            {content && (
              <div style={{
                fontSize: 13,
                lineHeight: '20px',
                color: isMe ? '#fff' : 'var(--text-primary)',
                wordBreak: 'break-word' as any,
              }}>
                {highlightText(content, searchQuery || '')}
                <span style={{
                  ...styles.timeInline,
                  color: isMe ? 'rgba(255,255,255,.45)' : 'var(--text-tertiary)',
                }}>
                  {formattedTime}
                  {isMe && readStatus && (
                    <span
                      style={{ cursor: readStatus === 'read' ? 'pointer' : 'default', position: 'relative' as any }}
                      onClick={(e) => { if (readStatus === 'read') { e.stopPropagation(); setShowSeenBy(prev => !prev) } }}
                    >
                      {readStatus === 'read'
                        ? <CheckCheck size={13} style={{ marginLeft: 3, verticalAlign: 'middle', color: 'rgba(255,255,255,.7)' }} />
                        : <Check size={13} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
                      }
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Time fallback for media-only messages */}
            {!content && (
              <div style={{
                ...styles.time,
                color: isMe ? 'rgba(255,255,255,.5)' : 'var(--text-tertiary)',
              }}>
                {formattedTime}
                {isMe && readStatus && (
                  <span
                    style={{ cursor: readStatus === 'read' ? 'pointer' : 'default', position: 'relative' as any }}
                    onClick={(e) => { if (readStatus === 'read') { e.stopPropagation(); setShowSeenBy(prev => !prev) } }}
                  >
                    {readStatus === 'read'
                      ? <CheckCheck size={13} style={{ marginLeft: 3, verticalAlign: 'middle', color: 'rgba(255,255,255,.7)' }} />
                      : <Check size={13} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
                    }
                  </span>
                )}
              </div>
            )}

            {/* Seen by popup */}
            {showSeenBy && readByNames && readByNames.length > 0 && (
              <div ref={seenByRef} style={styles.seenByPopup} onClick={(e) => e.stopPropagation()}>
                <div style={styles.seenByTitle}>Vu par</div>
                {readByNames.map((name, i) => (
                  <div key={i} style={styles.seenByName}>
                    <CheckCheck size={11} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reaction picker (triggered from context menu) */}
          {showReactionPicker && onReaction && (
            <div style={{
              ...styles.reactionPicker,
              ...(isMe ? { right: 0 } : { left: 0 }),
            }}>
              {QUICK_EMOJIS.map(e => (
                <button key={e} style={styles.reactionPickerBtn} onClick={() => onReaction(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions display */}
        {reactionEntries.length > 0 && (
          <div style={styles.reactionsRow}>
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                style={styles.reactionChip}
                onClick={() => onReaction?.(emoji)}
                title={users.length + ' réaction(s)'}
              >
                {emoji} <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 2,
    padding: '3px 0',
    borderRadius: 8,
    transition: 'background 0.1s',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  onlineDot: {
    position: 'absolute' as any,
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#22c55e',
    border: '2px solid var(--bg-main)',
  },
  bubbleWrap: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '70%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  bubble: {
    padding: '7px 12px',
    borderRadius: 12,
    position: 'relative' as any,
  },
  bubbleMe: {
    background: 'var(--brand)',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderBottomLeftRadius: 4,
  },
  bubbleSupport: {
    background: 'var(--bg-card)',
    border: '1px solid var(--purple-bg)',
    borderBottomLeftRadius: 4,
  },
  pinnedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--warning)',
    marginBottom: 4,
  },
  timeInline: {
    fontSize: 10,
    marginLeft: 8,
    whiteSpace: 'nowrap' as any,
    verticalAlign: 'baseline',
  },
  time: {
    fontSize: 10,
    marginTop: 3,
    textAlign: 'right' as const,
  },

  // Reply quote
  replyQuote: {
    borderLeft: '2px solid',
    padding: '4px 8px',
    marginBottom: 6,
    borderRadius: '0 4px 4px 0',
    background: 'rgba(0,0,0,.05)',
  },
  replyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 1,
  },
  replyText: {
    fontSize: 11,
    lineHeight: '15px',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 220,
  },

  // Media
  msgImage: {
    maxWidth: '100%',
    maxHeight: 200,
    borderRadius: 8,
    marginBottom: 4,
    cursor: 'pointer',
    objectFit: 'cover' as any,
  },
  fileLink: {
    fontSize: 12,
    fontWeight: 600,
    textDecoration: 'underline',
    marginBottom: 4,
    display: 'block',
  },

  // Voice message
  voiceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: 2,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 99,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'transform 0.15s ease, opacity 0.15s ease',
  },
  voiceWave: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  speedBtn: {
    border: 'none',
    borderRadius: 6,
    padding: '2px 6px',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    transition: 'opacity 0.15s',
  },

  // Reaction picker
  reactionPicker: {
    position: 'absolute' as any,
    bottom: '100%',
    marginBottom: 4,
    display: 'flex',
    gap: 2,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 20,
    padding: '3px 4px',
    boxShadow: '0 4px 16px rgba(0,0,0,.1)',
    zIndex: 10,
  },
  reactionPickerBtn: {
    width: 28,
    height: 28,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 15,
    borderRadius: 99,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s',
  },

  // Reactions row
  reactionsRow: {
    display: 'flex',
    flexWrap: 'wrap' as any,
    gap: 4,
    marginTop: 2,
  },
  reactionChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 99,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    fontSize: 14,
  },

  // Seen by popup
  seenByPopup: {
    position: 'absolute' as any,
    bottom: '100%',
    right: 0,
    marginBottom: 6,
    padding: '8px 12px',
    borderRadius: 10,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    boxShadow: '0 4px 16px rgba(0,0,0,.12)',
    zIndex: 20,
    minWidth: 140,
    animation: 'ctxIn 0.15s ease',
  },
  seenByTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
    marginBottom: 6,
    textTransform: 'uppercase' as any,
  },
  seenByName: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
    padding: '3px 0',
    whiteSpace: 'nowrap' as any,
  },
}
