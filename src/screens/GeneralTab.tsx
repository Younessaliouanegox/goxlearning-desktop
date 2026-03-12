import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  MessageSquare, Copy, Reply, Trash2, Pin, Download,
  CornerUpRight, Pencil, Check, X, PinOff, Smile,
} from 'lucide-react'
import { useChat } from '../lib/hooks/useChat'
import { supabase } from '../lib/supabase'
import ChatBubble from '../components/ChatBubble'
import ChatInput from '../components/ChatInput'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'
import Empty from '../components/Empty'
import Loading from '../components/Loading'
import type { Student, Group, ChatMessage } from '../types'
import { canModerateChat } from '../lib/roles'

interface GeneralTabProps {
  group: Group | null
  student: Student
  groups?: Group[]
  searchQuery?: string
}

interface CtxState { x: number; y: number; message: ChatMessage }
interface ReplyState { id: string; senderName: string; content: string }

export default function GeneralTab({ group, student, groups = [], searchQuery = '' }: GeneralTabProps) {
  const {
    messages, loading, sendMessage, editMessage, pinMessage,
    toggleReaction, forwardMessage, deleteMessage,
  } = useChat(group?.id)

  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const [members, setMembers] = useState<{ id: string; name: string; avatar_url?: string | null }[]>([])

  useEffect(() => {
    if (!group) return
    ;(async () => {
      const [enrollRes, membersRes] = await Promise.all([
        supabase.from('enrollments').select('students(id, name, avatar_url)').eq('group_id', group.id),
        supabase.from('members').select('id, name, avatar_url'),
      ])
      const studentList = (enrollRes.data || []).map((e: any) => e.students).filter(Boolean)
      const memberList = (membersRes.data || []).map((m: any) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url }))
      setMembers([...studentList, ...memberList])
    })()
  }, [group?.id])
  const [replyTo, setReplyTo] = useState<ReplyState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null)
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isMember = !!student.role
  const senderType = isMember ? 'member' as const : 'student' as const
  const canModerate = canModerateChat(student.role)

  const isMyMessage = useCallback((m: ChatMessage) => {
    return isMember ? m.member_id === student.id : m.student_id === student.id
  }, [isMember, student.id])

  // Pinned messages
  const pinnedMessages = messages.filter(m => m.pinned)

  // Filter messages by search
  const filteredMessages = searchQuery.length >= 2
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const handleContextMenu = (e: React.MouseEvent, m: ChatMessage) => {
    setReactionPickerMsgId(null)
    setCtx({ x: e.clientX, y: e.clientY, message: m })
  }

  const getMenuItems = (m: ChatMessage): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []
    const mine = isMyMessage(m)

    items.push({
      label: 'Répondre',
      icon: <Reply size={14} />,
      onClick: () => setReplyTo({ id: m.id, senderName: m.sender_name || 'Utilisateur', content: m.content }),
    })

    items.push({
      label: 'Réagir',
      icon: <Smile size={14} />,
      onClick: () => setReactionPickerMsgId(m.id),
    })

    if (m.content) {
      items.push({
        label: 'Copier le texte',
        icon: <Copy size={14} />,
        onClick: () => navigator.clipboard.writeText(m.content),
      })
    }

    if (mine && m.content) {
      items.push({
        label: 'Modifier',
        icon: <Pencil size={14} />,
        onClick: () => { setEditingId(m.id); setEditText(m.content) },
      })
    }

    items.push({
      label: 'Transférer',
      icon: <CornerUpRight size={14} />,
      onClick: () => setForwardMsg(m),
    })

    if (m.file_url) {
      items.push({
        label: m.file_type?.startsWith('image') ? 'Enregistrer l\'image' : 'Enregistrer le fichier',
        icon: <Download size={14} />,
        onClick: () => {
          const a = document.createElement('a')
          a.href = m.file_url!
          a.download = m.file_url!.split('/').pop() || 'file'
          a.target = '_blank'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        },
      })
      items.push({
        label: 'Copier le lien média',
        icon: <Copy size={14} />,
        onClick: () => navigator.clipboard.writeText(m.file_url!),
      })
    }

    if (canModerate) {
      items.push({
        label: m.pinned ? 'Désépingler' : 'Épingler',
        icon: m.pinned ? <PinOff size={14} /> : <Pin size={14} />,
        divider: true,
        onClick: () => pinMessage(m.id, !m.pinned),
      })
    }

    if (mine || canModerate) {
      items.push({
        label: 'Supprimer',
        icon: <Trash2 size={14} />,
        danger: true,
        divider: !canModerate,
        onClick: () => deleteMessage(m.id),
      })
    }

    return items
  }

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.background = 'var(--brand-light)'
      setTimeout(() => { el.style.background = 'transparent' }, 1500)
    }
  }

  const handleSend = (text: string, file?: File) => {
    sendMessage(student.id, text, senderType, student.name, file)
    setReplyTo(null)
  }

  const handleEditSave = () => {
    if (editingId && editText.trim()) editMessage(editingId, editText)
    setEditingId(null); setEditText('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave() }
    if (e.key === 'Escape') { setEditingId(null); setEditText('') }
  }

  const handleForward = (targetGroupId: string) => {
    if (!forwardMsg) return
    forwardMessage(
      targetGroupId, forwardMsg.content, student.id, senderType,
      student.name, forwardMsg.file_url, forwardMsg.file_type,
    )
    setForwardMsg(null)
  }

  if (!group) return <Empty icon={MessageSquare} text="Sélectionnez un groupe" sub="Choisissez un groupe dans la barre latérale" />
  if (loading) return <Loading />

  return (
    <div style={styles.wrapper}>
      {/* Pinned messages bar */}
      {pinnedMessages.length > 0 && (
        <div style={styles.pinBar}>
          <Pin size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <button
            style={styles.pinBarText}
            onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
          >
            <strong>{pinnedMessages.length} message(s) épinglé(s)</strong>
            <span style={{ color: 'var(--text-tertiary)' }}>
              {' — '}{pinnedMessages[pinnedMessages.length - 1].content?.slice(0, 50)}
            </span>
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messageList} ref={listRef} onClick={() => reactionPickerMsgId && setReactionPickerMsgId(null)}>
        {filteredMessages.length === 0 && (
          <Empty
            icon={MessageSquare}
            text={searchQuery ? 'Aucun résultat' : 'Aucun message'}
            sub={searchQuery ? `Aucun message pour "${searchQuery}"` : 'Commencez la conversation !'}
          />
        )}
        {filteredMessages.map((m) => {
          const isMe = isMyMessage(m)
          const isEditing = editingId === m.id

          if (isEditing) {
            return (
              <div key={m.id} id={`msg-${m.id}`} style={styles.editRow}>
                <div style={styles.editLabel}>Modifier le message</div>
                <div style={styles.editInputRow}>
                  <input autoFocus style={styles.editInput} value={editText}
                    onChange={(e) => setEditText(e.target.value)} onKeyDown={handleEditKeyDown} />
                  <button style={styles.editSaveBtn} onClick={handleEditSave}><Check size={14} /></button>
                  <button style={styles.editCancelBtn} onClick={() => { setEditingId(null); setEditText('') }}><X size={14} /></button>
                </div>
              </div>
            )
          }

          return (
            <div key={m.id} id={`msg-${m.id}`} style={{ transition: 'background 0.3s', borderRadius: 8 }}>
              <ChatBubble
                content={m.content}
                time={m.created_at}
                isMe={isMe}
                senderName={m.sender_name || undefined}
                senderRole={m.sender_type === 'member' ? (m.sender_role || 'member') : 'student'}
                senderAvatarUrl={m.sender_avatar_url}
                variant={m.sender_type === 'member' ? 'support' : 'group'}
                fileUrl={m.file_url}
                fileType={m.file_type}
                pinned={m.pinned}
                reactions={m.reactions}
                searchQuery={searchQuery}
                showReactionPicker={reactionPickerMsgId === m.id}
                onContextMenu={(e) => handleContextMenu(e, m)}
                onReplyClick={scrollToMessage}
                onReaction={(emoji) => { toggleReaction(m.id, emoji, student.id); setReactionPickerMsgId(null) }}
              />
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        placeholder="Écrire un message..."
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        members={members}
      />

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} items={getMenuItems(ctx.message)} onClose={() => setCtx(null)} />
      )}

      {/* Forward modal */}
      {forwardMsg && (
        <div style={styles.modalOverlay} onClick={() => setForwardMsg(null)}>
          <div style={styles.forwardModal} onClick={e => e.stopPropagation()}>
            <div style={styles.forwardHeader}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Transférer le message</h3>
              <button style={styles.modalClose} onClick={() => setForwardMsg(null)}><X size={16} /></button>
            </div>
            <div style={styles.forwardPreview}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{forwardMsg.sender_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{forwardMsg.content?.slice(0, 100)}</div>
            </div>
            <div style={styles.forwardList}>
              {groups.filter(g => g.id !== group?.id).map(g => (
                <button key={g.id} style={styles.forwardItem} onClick={() => handleForward(g.id)}>
                  <div style={styles.forwardAvatar}>{g.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                  <CornerUpRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              ))}
              {groups.filter(g => g.id !== group?.id).length === 0 && (
                <div style={{ padding: 20, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  Aucun autre groupe disponible
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-main)',
    minHeight: 0,
    overflow: 'hidden',
  },
  pinBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px',
    background: 'var(--warning-bg)',
    borderBottom: '1px solid var(--border-light)',
    cursor: 'pointer',
  },
  pinBarText: {
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--text-primary)',
    textAlign: 'left' as any,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  messageList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  editRow: {
    padding: '8px 12px',
    background: 'var(--brand-light)',
    borderRadius: 10,
    marginBottom: 4,
  },
  editLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--brand)',
    marginBottom: 6,
    textTransform: 'uppercase' as any,
    letterSpacing: '0.04em',
  },
  editInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  editInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--brand)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
  },
  editSaveBtn: {
    width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--brand)',
    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  editCancelBtn: {
    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-card)',
    color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  /* Forward modal */
  modalOverlay: {
    position: 'fixed' as any, inset: 0, background: 'rgba(0,0,0,.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  forwardModal: {
    width: 360, maxHeight: '70vh', background: 'var(--bg-card)', borderRadius: 14,
    boxShadow: '0 12px 48px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' as any, overflow: 'hidden',
  },
  forwardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid var(--border-light)',
  },
  modalClose: {
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)',
    display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6,
  },
  forwardPreview: {
    padding: '10px 16px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-light)',
  },
  forwardList: {
    flex: 1, overflowY: 'auto' as any, padding: '4px 0',
  },
  forwardItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
    textAlign: 'left' as any, transition: 'background 0.1s',
  },
  forwardAvatar: {
    width: 32, height: 32, borderRadius: 9, background: 'var(--brand)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
}
