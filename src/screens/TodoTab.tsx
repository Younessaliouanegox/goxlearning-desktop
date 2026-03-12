import React, { useState, useRef } from 'react'
import {
  Plus, Trash2, CheckCircle2, Circle, ListTodo, ClipboardList,
  Copy, Paperclip, FileText, Image, Film, Archive, X, Download, Eye,
} from 'lucide-react'
import { useTodos } from '../lib/hooks/useTodos'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'
import Empty from '../components/Empty'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import type { Student, Group, Todo } from '../types'
import { canManageTodos } from '../lib/roles'

interface TodoTabProps {
  group: Group | null
  student: Student
}

function getFileIcon(type: string | null) {
  if (!type) return FileText
  if (type.startsWith('image')) return Image
  if (type.startsWith('video')) return Film
  if (type.includes('zip') || type.includes('archive') || type.includes('rar')) return Archive
  return FileText
}

function getFileName(url: string) {
  const name = url.split('/').pop()?.split('?')[0] || 'Fichier'
  return name.length > 30 ? name.slice(0, 27) + '...' : name
}

export default function TodoTab({ group, student }: TodoTabProps) {
  const { todos, loading, toggleTodo, addTodo, deleteTodo, completedCount } =
    useTodos(student.id, group?.id)
  const [showAdd, setShowAdd] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const isStaff = canManageTodos(student.role)

  const handleCtx = (e: React.MouseEvent, t: Todo) => {
    e.preventDefault()
    const items: ContextMenuItem[] = [
      {
        label: t.is_completed ? 'Marquer non terminée' : 'Marquer terminée',
        icon: t.is_completed ? <Circle size={14} /> : <CheckCircle2 size={14} />,
        onClick: () => toggleTodo(t),
      },
      { label: 'Copier le titre', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(t.title) },
    ]
    if (t.file_url) {
      items.push({ label: 'Ouvrir le fichier', icon: <Download size={14} />, onClick: () => window.open(t.file_url!, '_blank') })
    }
    if (isStaff) {
      items.push({ label: 'Supprimer', icon: <Trash2 size={14} />, danger: true, divider: true, onClick: () => deleteTodo(t.id) })
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, items })
  }

  if (!group) return <Empty icon={ClipboardList} text="Sélectionnez un groupe" sub="Choisissez un groupe dans la barre latérale" />
  if (loading) return <Loading />

  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0

  return (
    <div style={styles.scroll}>
      {/* Header */}
      <div style={styles.topRow}>
        <div style={styles.headerLeft}>
          <div>
            <div style={styles.title}>Tâches du groupe</div>
            <div style={styles.subtitle}>{completedCount}/{todos.length} terminées</div>
          </div>
          {todos.length > 0 && (
            <div style={styles.progressWrap}>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <span style={styles.progressText}>{progress}%</span>
            </div>
          )}
        </div>
        {isStaff && (
          <button style={styles.addBtn} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Ajouter
          </button>
        )}
      </div>

      {/* Todo list */}
      {todos.length === 0 && (
        <Empty
          icon={ClipboardList}
          text="Aucune tâche"
          sub={isStaff ? 'Ajoutez la première tâche pour le groupe' : 'Aucune tâche assignée pour le moment'}
        />
      )}
      <div style={styles.list}>
        {todos.map((t, i) => (
          <TodoCard
            key={t.id}
            todo={t}
            index={i}
            onToggle={toggleTodo}
            onDelete={isStaff ? deleteTodo : undefined}
            onContextMenu={(e) => handleCtx(e, t)}
          />
        ))}
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {isStaff && (
        <AddTodoModal
          visible={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={async (title, desc, file) => { await addTodo(title, desc, file); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

function TodoCard({ todo, index, onToggle, onDelete, onContextMenu }: {
  todo: Todo
  index: number
  onToggle: (t: Todo) => void
  onDelete?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const done = todo.is_completed
  const FileIcon = getFileIcon(todo.file_type)
  const isImage = todo.file_type?.startsWith('image')
  const isVideo = todo.file_type?.startsWith('video')

  return (
    <div
      style={{ ...styles.card, animationDelay: `${index * 30}ms` }}
      className="card animate-fade-in"
      onContextMenu={onContextMenu}
    >
      <button style={styles.checkbox} onClick={() => onToggle(todo)}>
        {done
          ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          : <Circle size={20} style={{ color: 'var(--border)' }} />
        }
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          fontSize: 13,
          textDecoration: done ? 'line-through' : 'none',
          color: done ? 'var(--text-tertiary)' : 'var(--text-primary)',
        }}>
          {todo.title}
        </div>
        {todo.description && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginTop: 3,
            lineHeight: '16px',
          }}>
            {todo.description}
          </div>
        )}

        {/* File attachment */}
        {todo.file_url && (
          <div style={styles.fileSection}>
            {isImage && (
              <img
                src={todo.file_url}
                alt=""
                style={styles.fileImage}
                onClick={() => window.open(todo.file_url!, '_blank')}
              />
            )}
            {isVideo && (
              <video
                src={todo.file_url}
                controls
                style={styles.fileVideo}
              />
            )}
            {!isImage && !isVideo && (
              <a href={todo.file_url} target="_blank" rel="noreferrer" style={styles.fileLink}>
                <FileIcon size={14} />
                <span>{getFileName(todo.file_url)}</span>
                <Download size={12} style={{ flexShrink: 0 }} />
              </a>
            )}
          </div>
        )}
      </div>
      {onDelete && (
        <button style={styles.deleteBtn} onClick={() => onDelete(todo.id)}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function AddTodoModal({ visible, onClose, onAdd }: {
  visible: boolean
  onClose: () => void
  onAdd: (title: string, desc: string | null, file?: File) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!title.trim()) return
    setUploading(true)
    await onAdd(title.trim(), desc.trim() || null, file || undefined)
    setTitle('')
    setDesc('')
    setFile(null)
    setUploading(false)
  }

  const handleClose = () => {
    setTitle('')
    setDesc('')
    setFile(null)
    onClose()
  }

  return (
    <Modal visible={visible} title="Nouvelle tâche" onClose={handleClose}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Titre</label>
        <input
          style={styles.input}
          placeholder="Ex: Terminer le chapitre 3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Description <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optionnel)</span></label>
        <textarea
          style={{ ...styles.input, minHeight: 70, resize: 'vertical' as any }}
          placeholder="Ajouter des détails..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      {/* File upload */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Fichier joint <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optionnel)</span></label>
        {file ? (
          <div style={styles.filePreview}>
            <FileText size={14} style={{ flexShrink: 0, color: 'var(--brand)' }} />
            <span style={styles.filePreviewName}>{file.name}</span>
            <span style={styles.filePreviewSize}>{(file.size / 1024).toFixed(0)} Ko</span>
            <button style={styles.fileRemoveBtn} onClick={() => setFile(null)}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <button style={styles.fileUploadBtn} onClick={() => fileRef.current?.click()}>
            <Paperclip size={14} />
            <span>Image, PDF, ZIP, Vidéo...</span>
          </button>
        )}
        <input
          type="file"
          ref={fileRef}
          style={{ display: 'none' }}
          accept="image/*,video/*,.pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
          onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]) }}
        />
      </div>

      <div style={styles.modalActions}>
        <button style={styles.cancelBtn} onClick={handleClose}>Annuler</button>
        <button
          style={{
            ...styles.addBtn,
            flex: 1,
            opacity: !title.trim() || uploading ? 0.5 : 1,
          }}
          onClick={handleAdd}
          disabled={!title.trim() || uploading}
        >
          <ListTodo size={14} /> {uploading ? 'Envoi...' : 'Ajouter la tâche'}
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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
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
  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 80,
    height: 5,
    borderRadius: 99,
    background: 'var(--border-light)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    background: 'var(--success)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--success)',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 10,
    background: 'var(--brand)',
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
    gap: 12,
    padding: '14px 16px',
    transition: 'all 0.15s ease',
  },
  checkbox: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginTop: 1,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    transition: 'all 0.15s ease',
    opacity: 0.5,
  },

  // File display on cards
  fileSection: {
    marginTop: 8,
  },
  fileImage: {
    maxWidth: 200,
    maxHeight: 140,
    borderRadius: 8,
    objectFit: 'cover' as any,
    cursor: 'pointer',
    border: '1px solid var(--border-light)',
  },
  fileVideo: {
    maxWidth: 260,
    maxHeight: 160,
    borderRadius: 8,
    outline: 'none',
  },
  fileLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'var(--bg-muted)',
    border: '1px solid var(--border-light)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--brand)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },

  // Modal form
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
    fontFamily: 'inherit',
  },
  fileUploadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    background: 'var(--bg-muted)',
    border: '1.5px dashed var(--border)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  filePreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
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
  filePreviewSize: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  fileRemoveBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: 'none',
    background: 'var(--border-light)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    fontFamily: 'inherit',
  },
}
