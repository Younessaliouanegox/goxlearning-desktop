import React, { useState, useRef } from 'react'
import { AlertTriangle, Pin, Clock, User, Megaphone, Plus, X, ImagePlus, Send, Loader2, Trash2, Copy, FileText } from 'lucide-react'
import { useAnnouncements } from '../lib/hooks/useAnnouncements'
import { uploadToR2 } from '../lib/upload'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'
import Empty from '../components/Empty'
import Loading from '../components/Loading'
import type { Group, Student, Announcement } from '../types'
import { canManageAnnouncements } from '../lib/roles'

interface AnnoncesTabProps {
  group: Group | null
  student: Student
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'urgent': return { bg: 'var(--error-bg)', color: 'var(--error)', label: 'Urgent' }
    case 'important': return { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Important' }
    default: return { bg: 'var(--blue-bg)', color: 'var(--blue)', label: 'Normal' }
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AnnoncesTab({ group, student }: AnnoncesTabProps) {
  const { announcements, loading, addAnnouncement, deleteAnnouncement } = useAnnouncements(group?.id)
  const [showForm, setShowForm] = useState(false)
  const isStaff = canManageAnnouncements(student.role)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const handleCtx = (e: React.MouseEvent, a: Announcement) => {
    e.preventDefault()
    const items: ContextMenuItem[] = [
      { label: 'Copier le titre', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(a.title) },
      { label: 'Copier le contenu', icon: <FileText size={14} />, onClick: () => navigator.clipboard.writeText(a.content) },
    ]
    if (isStaff) {
      items.push({ label: 'Supprimer', icon: <Trash2 size={14} />, danger: true, divider: true, onClick: () => deleteAnnouncement(a.id) })
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, items })
  }

  if (!group) return <Empty icon={Megaphone} text="Sélectionnez un groupe" sub="Choisissez un groupe dans la barre latérale" />
  if (loading) return <Loading />

  return (
    <div style={styles.scroll}>
      {/* Compose button for staff */}
      {isStaff && !showForm && (
        <button style={styles.composeBtn} onClick={() => setShowForm(true)}>
          <Plus size={16} />
          Nouvelle annonce
        </button>
      )}

      {/* Compose form */}
      {isStaff && showForm && (
        <ComposeForm
          onSubmit={async (data) => {
            await addAnnouncement(student.id, data)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {announcements.length === 0 && !showForm && (
        <Empty icon={Megaphone} text="Aucune annonce" sub="Les annonces importantes apparaîtront ici" />
      )}
      <div style={styles.list}>
        {announcements.map((a, i) => (
          <AnnouncementCard key={a.id} announcement={a} index={i} isStaff={isStaff} onDelete={deleteAnnouncement} onContextMenu={(e) => handleCtx(e, a)} />
        ))}
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
    </div>
  )
}

interface ComposeData {
  title: string
  content: string
  priority: 'normal' | 'important' | 'urgent'
  pinned: boolean
  image_url: string | null
}

function ComposeForm({ onSubmit, onCancel }: { onSubmit: (data: ComposeData) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal')
  const [pinned, setPinned] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    setSending(true)
    let image_url: string | null = null
    if (imageFile) {
      image_url = await uploadToR2(imageFile, 'announcements')
    }
    await onSubmit({ title: title.trim(), content: content.trim(), priority, pinned, image_url })
    setSending(false)
  }

  return (
    <div style={styles.formCard} className="card">
      <div style={styles.formHeader}>
        <span style={styles.formTitle}>Nouvelle annonce</span>
        <button style={styles.closeBtn} onClick={onCancel}><X size={16} /></button>
      </div>

      <input
        style={styles.input}
        placeholder="Titre de l'annonce"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        style={{ ...styles.input, minHeight: 80, resize: 'vertical' as any }}
        placeholder="Contenu de l'annonce..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* Image preview */}
      {imagePreview && (
        <div style={styles.imagePreviewWrap}>
          <img src={imagePreview} style={styles.imagePreview} alt="preview" />
          <button style={styles.removeImgBtn} onClick={() => { setImageFile(null); setImagePreview(null) }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div style={styles.formControls}>
        <div style={styles.formLeft}>
          {/* Image upload */}
          <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
          <button style={styles.iconBtn} onClick={() => fileRef.current?.click()} title="Ajouter une image">
            <ImagePlus size={16} />
          </button>

          {/* Priority */}
          <select
            style={styles.select}
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Pin */}
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Épingler
          </label>
        </div>

        <button
          style={{ ...styles.sendBtn, opacity: (!title.trim() || !content.trim() || sending) ? 0.5 : 1 }}
          disabled={!title.trim() || !content.trim() || sending}
          onClick={handleSubmit}
        >
          {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          {sending ? 'Envoi...' : 'Publier'}
        </button>
      </div>
    </div>
  )
}

function AnnouncementCard({ announcement, index, isStaff, onDelete, onContextMenu }: { announcement: Announcement; index: number; isStaff?: boolean; onDelete?: (id: string) => void; onContextMenu?: (e: React.MouseEvent) => void }) {
  const priority = getPriorityStyle(announcement.priority)

  return (
    <div
      style={{ ...styles.card, animationDelay: `${index * 40}ms` }}
      className="card animate-fade-in"
      onContextMenu={onContextMenu}
    >
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={styles.cardHeaderLeft}>
          {announcement.pinned && (
            <Pin size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
          )}
          <span style={{
            ...styles.priorityBadge,
            background: priority.bg,
            color: priority.color,
          }}>
            {announcement.priority === 'urgent' && <AlertTriangle size={10} />}
            {priority.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={styles.dateBadge}>
            <Clock size={10} />
            {formatDate(announcement.created_at)}
          </div>
          {isStaff && onDelete && (
            <button
              style={styles.deleteBtn}
              onClick={() => onDelete(announcement.id)}
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 style={styles.cardTitle}>{announcement.title}</h3>
      <p style={styles.cardContent}>{announcement.content}</p>

      {/* Image */}
      {announcement.image_url && (
        <img
          src={announcement.image_url}
          alt=""
          style={styles.cardImage}
          onClick={() => window.open(announcement.image_url!, '_blank')}
        />
      )}

      {/* Footer */}
      <div style={styles.cardFooter}>
        <User size={12} />
        <span>{announcement.member_name}</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    background: 'var(--bg-main)',
  },
  composeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: 'var(--brand)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 16,
    transition: 'all 0.15s ease',
  },
  formCard: {
    padding: 18,
    marginBottom: 16,
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 4,
    borderRadius: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: 13,
    marginBottom: 8,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as any,
  },
  imagePreviewWrap: {
    position: 'relative' as any,
    marginBottom: 8,
    display: 'inline-block',
  },
  imagePreview: {
    maxWidth: 200,
    maxHeight: 120,
    borderRadius: 8,
    objectFit: 'cover' as any,
  },
  removeImgBtn: {
    position: 'absolute' as any,
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 99,
    background: 'rgba(0,0,0,.6)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  formLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-main)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  select: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--brand)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    padding: 18,
    transition: 'all 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: 10,
    fontWeight: 700,
  },
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 13,
    lineHeight: '20px',
    color: 'var(--text-secondary)',
    margin: 0,
    whiteSpace: 'pre-wrap' as any,
  },
  cardImage: {
    marginTop: 10,
    maxWidth: '100%',
    maxHeight: 300,
    borderRadius: 10,
    objectFit: 'cover' as any,
    cursor: 'pointer',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: 'none',
    background: 'var(--error-bg)',
    color: 'var(--error)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTop: '1px solid var(--border-light)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
}
