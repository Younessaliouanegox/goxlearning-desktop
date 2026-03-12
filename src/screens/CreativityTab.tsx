import React, { useState, useRef } from 'react'
import { Plus, Upload, FileText, Image, Clock, CheckCircle2, Eye, Trash2, User, Palette, Paperclip, X, Copy, ExternalLink } from 'lucide-react'
import { useCreativity } from '../lib/hooks/useCreativity'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'
import Empty from '../components/Empty'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import type { Student, Group, CreativityUpload } from '../types'

interface CreativityTabProps {
  group: Group | null
  student: Student
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'approved': return { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Approuvé', icon: CheckCircle2 }
    case 'reviewed': return { bg: 'var(--blue-bg)', color: 'var(--blue)', label: 'Examiné', icon: Eye }
    default: return { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Soumis', icon: Clock }
  }
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return FileText
  if (fileType.startsWith('image')) return Image
  return FileText
}

export default function CreativityTab({ group, student }: CreativityTabProps) {
  const { uploads, loading, addUpload, deleteUpload } = useCreativity(group?.id, student.id, student.role)
  const [showAdd, setShowAdd] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  if (!group) return <Empty icon={Palette} text="Sélectionnez un groupe" sub="Choisissez un groupe dans la barre latérale" />
  if (loading) return <Loading />

  const isMe = (u: any) => u.student_id === student.id || u.member_id === student.id
  const myUploads = uploads.filter(isMe)
  const othersUploads = uploads.filter((u) => !isMe(u))

  const handleCtx = (e: React.MouseEvent, u: CreativityUpload, owner: boolean) => {
    e.preventDefault()
    const items: ContextMenuItem[] = [
      { label: 'Copier le titre', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(u.title) },
    ]
    if (u.file_url) {
      items.push({ label: 'Ouvrir le fichier', icon: <ExternalLink size={14} />, onClick: () => window.open(u.file_url!, '_blank') })
    }
    if (owner && u.status === 'submitted') {
      items.push({ label: 'Supprimer', icon: <Trash2 size={14} />, danger: true, divider: true, onClick: () => deleteUpload(u.id) })
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, items })
  }

  return (
    <div style={styles.scroll}>
      {/* Header */}
      <div style={styles.topRow}>
        <div>
          <div style={styles.title}>Créativité</div>
          <div style={styles.subtitle}>{uploads.length} travaux soumis</div>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Soumettre
        </button>
      </div>

      {uploads.length === 0 && (
        <Empty icon={Palette} text="Aucun travail" sub="Soumettez votre premier travail créatif" />
      )}

      {/* My uploads */}
      {myUploads.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Mes travaux</div>
          <div style={styles.list}>
            {myUploads.map((u, i) => (
              <UploadCard key={u.id} upload={u} index={i} isOwner onDelete={deleteUpload} onContextMenu={(e) => handleCtx(e, u, true)} />
            ))}
          </div>
        </>
      )}

      {/* Others uploads */}
      {othersUploads.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: 16 }}>Travaux des autres</div>
          <div style={styles.list}>
            {othersUploads.map((u, i) => (
              <UploadCard key={u.id} upload={u} index={i} isOwner={false} onDelete={deleteUpload} onContextMenu={(e) => handleCtx(e, u, false)} />
            ))}
          </div>
        </>
      )}

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      <AddUploadModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={async (title, desc, file) => {
          await addUpload(title, desc, file)
          setShowAdd(false)
        }}
      />
    </div>
  )
}

function UploadCard({ upload, index, isOwner, onDelete, onContextMenu }: {
  upload: CreativityUpload
  index: number
  isOwner: boolean
  onDelete: (id: string) => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const status = getStatusStyle(upload.status)
  const StatusIcon = status.icon
  const FileIcon = getFileIcon(upload.file_type)

  return (
    <div
      style={{ ...styles.card, animationDelay: `${index * 30}ms` }}
      className="card animate-fade-in"
      onContextMenu={onContextMenu}
    >
      <div style={styles.cardIcon}>
        <FileIcon size={18} />
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{upload.title}</div>
        {upload.description && (
          <div style={styles.cardDesc}>{upload.description}</div>
        )}
        {upload.file_url && upload.file_type?.startsWith('image') && (
          <img
            src={upload.file_url}
            alt=""
            style={styles.cardImage}
            onClick={() => window.open(upload.file_url!, '_blank')}
          />
        )}
        {upload.file_url && !upload.file_type?.startsWith('image') && (
          <a href={upload.file_url} target="_blank" rel="noreferrer" style={styles.cardFileLink}>
            <FileText size={12} /> {upload.file_url.split('/').pop()?.slice(0, 30) || 'Fichier'}
          </a>
        )}
        <div style={styles.cardMeta}>
          <User size={10} />
          <span>{upload.student_name}</span>
          <span style={styles.dot} />
          <span>{formatDate(upload.created_at)}</span>
          <span style={{
            ...styles.statusBadge,
            background: status.bg,
            color: status.color,
          }}>
            <StatusIcon size={10} />
            {status.label}
          </span>
        </div>
        {upload.feedback && (
          <div style={styles.feedback}>
            Feedback: {upload.feedback}
          </div>
        )}
      </div>
      {isOwner && upload.status === 'submitted' && (
        <button style={styles.deleteBtn} onClick={() => onDelete(upload.id)}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function AddUploadModal({ visible, onClose, onAdd }: {
  visible: boolean
  onClose: () => void
  onAdd: (title: string, desc: string | null, file?: File | null) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File | null) => {
    setFile(f)
    if (f && f.type.startsWith('image')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const handleAdd = async () => {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    await onAdd(title.trim(), desc.trim() || null, file)
    setTitle('')
    setDesc('')
    setFile(null)
    setPreview(null)
    setSubmitting(false)
  }

  const handleClose = () => {
    setTitle('')
    setDesc('')
    setFile(null)
    setPreview(null)
    onClose()
  }

  return (
    <Modal visible={visible} title="Soumettre un travail" onClose={handleClose}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Titre</label>
        <input
          style={styles.input}
          placeholder="Ex: Projet de design final"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>
          Description <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optionnel)</span>
        </label>
        <textarea
          style={{ ...styles.input, minHeight: 70, resize: 'vertical' as any }}
          placeholder="Décrivez votre travail..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      {/* File upload */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          Fichier / Image <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optionnel)</span>
        </label>
        {!file ? (
          <button style={styles.filePickerBtn} onClick={() => fileRef.current?.click()}>
            <Paperclip size={14} />
            Ajouter un fichier ou une image
          </button>
        ) : (
          <div style={styles.filePreviewRow}>
            {preview ? (
              <img src={preview} alt="" style={styles.filePreviewImg} />
            ) : (
              <div style={styles.filePreviewIcon}>
                <FileText size={16} />
              </div>
            )}
            <div style={styles.filePreviewName}>{file.name}</div>
            <button style={styles.fileRemoveBtn} onClick={() => { setFile(null); setPreview(null) }}>
              <X size={14} />
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.zip,.psd,.ai,.sketch,.fig"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>

      <div style={styles.modalActions}>
        <button style={styles.cancelBtn} onClick={handleClose}>Annuler</button>
        <button
          style={{
            ...styles.submitBtn,
            opacity: !title.trim() || submitting ? 0.5 : 1,
          }}
          onClick={handleAdd}
          disabled={!title.trim() || submitting}
        >
          <Upload size={14} /> {submitting ? 'Envoi...' : 'Soumettre'}
        </button>
      </div>
    </Modal>
  )
}

const styles: Record<string, React.CSSProperties> = {
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    background: 'var(--bg-main)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as any,
    marginBottom: 8,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 10,
    background: 'var(--purple)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
    transition: 'all 0.15s ease',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '14px 16px',
    transition: 'all 0.15s ease',
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'var(--purple-bg)',
    color: 'var(--purple)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  cardDesc: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginTop: 2,
    lineHeight: '16px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    fontSize: 10,
    color: 'var(--text-tertiary)',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: '50%',
    background: 'var(--text-tertiary)',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 4,
  },
  feedback: {
    marginTop: 8,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'var(--blue-bg)',
    fontSize: 11,
    color: 'var(--blue)',
    fontWeight: 500,
    lineHeight: '16px',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    opacity: 0.5,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  modalActions: {
    display: 'flex',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    background: 'var(--bg-muted)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  submitBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 0',
    borderRadius: 10,
    background: 'var(--purple)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
  },
  filePickerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px dashed var(--border)',
    background: 'var(--bg-muted)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, color 0.15s',
  },
  filePreviewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg-muted)',
  },
  filePreviewImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    objectFit: 'cover' as any,
    flexShrink: 0,
  },
  filePreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: 'var(--purple-bg)',
    color: 'var(--purple)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filePreviewName: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardImage: {
    maxWidth: '100%',
    maxHeight: 160,
    borderRadius: 8,
    marginTop: 6,
    cursor: 'pointer',
    objectFit: 'cover' as any,
  },
  cardFileLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--purple)',
    marginTop: 6,
    textDecoration: 'underline',
  },
}
