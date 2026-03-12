import React, { useState, useRef } from 'react'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { uploadToR2 } from '../lib/upload'
import { supabase } from '../lib/supabase'
import type { Student } from '../types'

interface ProfileScreenProps {
  student: Student
  onBack: () => void
  onUpdateAvatar: (url: string) => void
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getRoleLabel(role?: string): string {
  if (!role) return 'Étudiant'
  const roles = role.split(',').map(r => r.trim())
  return roles.map(r => {
    switch (r) {
      case 'Admin': return 'Administrateur'
      case 'Teacher': return 'Formateur'
      case 'Support': return 'Support'
      case 'Confirmation': return 'Confirmation'
      default: return r
    }
  }).join(', ')
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export default function ProfileScreen({ student, onBack, onUpdateAvatar }: ProfileScreenProps) {
  const { first, last } = splitName(student.name)
  const [firstName, setFirstName] = useState(first)
  const [lastName, setLastName] = useState(last)
  const [phone, setPhone] = useState(student.phone || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadToR2(file, 'avatars')
    console.log('[AVATAR] Upload result:', url)
    if (url) {
      const table = student.role ? 'members' : 'students'
      console.log('[AVATAR] Saving to', table, 'id:', student.id)
      const { error } = await supabase.from(table).update({ avatar_url: url }).eq('id', student.id)
      if (error) {
        console.error('[AVATAR] DB update error:', error)
      } else {
        console.log('[AVATAR] Saved successfully')
        onUpdateAvatar(url)
      }
    }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const table = student.role ? 'members' : 'students'
    const newName = `${firstName.trim()} ${lastName.trim()}`.trim()
    await supabase.from(table).update({ name: newName, phone: phone || null }).eq('id', student.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={styles.container}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <button style={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={styles.pageTitle}>Paramètres</h1>
          <p style={styles.pageSub}>Gérez votre compte et vos préférences</p>
        </div>
      </div>

      <div style={styles.scrollArea}>
        <div style={styles.inner}>
          {/* Section title */}
          <h2 style={styles.sectionTitle}>Informations du profil</h2>
          <p style={styles.sectionSub}>Mettez à jour les détails de votre compte</p>

          {/* Avatar row */}
          <div style={styles.avatarRow}>
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="" style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarFallback}>{getInitials(student.name)}</div>
            )}
            <div>
              <div style={styles.avatarLabel}>Photo de profil</div>
              <div style={styles.avatarHint}>JPG, PNG ou GIF. 2 Mo max.</div>
              <button
                style={styles.changePhotoBtn}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Envoi...' : 'Changer la photo'}
              </button>
              <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>
          </div>

          {/* Form fields */}
          <div style={styles.fieldRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>PRÉNOM</label>
              <input style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>NOM</label>
              <input style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div style={styles.fieldRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>EMAIL</label>
              <input style={{ ...styles.input, ...styles.inputDisabled }} value={student.email} disabled />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>TÉLÉPHONE</label>
              <input style={styles.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+212 6..." />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>RÔLE</label>
            <input style={{ ...styles.input, ...styles.inputDisabled }} value={getRoleLabel(student.role)} disabled />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>IDENTIFIANT</label>
            <input
              style={{ ...styles.input, ...styles.inputDisabled, fontFamily: 'monospace', fontSize: 12 }}
              value={student.id}
              disabled
              onClick={() => navigator.clipboard.writeText(student.id)}
              title="Cliquer pour copier"
            />
          </div>

          {/* Save button */}
          <button
            style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saved ? 'Enregistré !' : saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-main)',
    minHeight: 0,
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 24px',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-light)',
    minHeight: 64,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-main)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
  },
  pageSub: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 1,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
  },
  inner: {
    maxWidth: 600,
    padding: '24px 32px 40px',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: '0 0 2px',
  },
  sectionSub: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: '0 0 20px',
  },

  // Avatar
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    padding: '16px 0',
    borderBottom: '1px solid var(--border-light)',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    objectFit: 'cover' as any,
    border: '2px solid var(--border-light)',
    flexShrink: 0,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--brand)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    flexShrink: 0,
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  avatarHint: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 2,
    marginBottom: 6,
  },
  changePhotoBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid var(--brand)',
    background: 'transparent',
    color: 'var(--brand)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Fields
  fieldRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
  },
  fieldGroup: {
    flex: 1,
    marginBottom: 16,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.06em',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-light)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as any,
    transition: 'border-color 0.15s',
  },
  inputDisabled: {
    background: 'var(--bg-main)',
    color: 'var(--text-tertiary)',
    cursor: 'default',
  },

  // Save
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--brand)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginTop: 8,
  },
}
