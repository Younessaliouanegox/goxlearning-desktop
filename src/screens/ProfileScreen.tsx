import React, { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, Save, Loader2, User, Bell, BellOff, Shield, Sun, Moon,
  AtSign, Megaphone, ClipboardList, Palette, Monitor, Volume2, Lock, Eye, EyeOff,
  Download, RefreshCw, Info, CheckCircle, ExternalLink,
} from 'lucide-react'
import { uploadToR2 } from '../lib/upload'
import { supabase, supabaseAuth } from '../lib/supabase'
import { useNotifPrefs, type NotifPrefs } from '../lib/hooks/useNotifPrefs'
import { useTheme } from '../lib/hooks/useTheme'
import { useUpdateChecker } from '../lib/hooks/useUpdateChecker'
import type { Student } from '../types'

type SettingsTab = 'profile' | 'notifications' | 'security' | 'appearance' | 'update' | 'about'

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

const TABS: { key: SettingsTab; label: string; icon: any }[] = [
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Sécurité', icon: Shield },
  { key: 'appearance', label: 'Apparence', icon: Sun },
  { key: 'update', label: 'Mise à jour', icon: Download },
  { key: 'about', label: 'À propos', icon: Info },
]

export default function ProfileScreen({ student, onBack, onUpdateAvatar }: ProfileScreenProps) {
  const { first, last } = splitName(student.name)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [firstName, setFirstName] = useState(first)
  const [lastName, setLastName] = useState(last)
  const [phone, setPhone] = useState(student.phone || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { prefs, update: updatePref } = useNotifPrefs()
  const { theme, toggle: toggleTheme, isDark } = useTheme()
  const update = useUpdateChecker()
  const [appVersion, setAppVersion] = useState(__APP_VERSION__)

  useEffect(() => {
    window.electronUpdater?.getAppVersion?.().then((v: string) => { if (v) setAppVersion(v) }).catch(() => {})
  }, [])

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadToR2(file, 'avatars')
    if (url) {
      const table = student.role ? 'members' : 'students'
      const { error } = await supabase.from(table).update({ avatar_url: url }).eq('id', student.id)
      if (!error) onUpdateAvatar(url)
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

  const handleChangePassword = async () => {
    if (newPw.length < 6) { setPwMsg({ type: 'err', text: 'Le mot de passe doit contenir au moins 6 caractères' }); return }
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas' }); return }
    setPwSaving(true)
    setPwMsg(null)
    const { error } = await supabaseAuth.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) { setPwMsg({ type: 'err', text: error.message }); return }
    setPwMsg({ type: 'ok', text: 'Mot de passe modifié avec succès' })
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwMsg(null), 3000)
  }

  // ── Toggle component ──
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button style={{ ...s.toggle, ...(on ? s.toggleOn : {}) }} onClick={onClick}>
      <div style={{ ...s.toggleKnob, ...(on ? s.toggleKnobOn : {}) }} />
    </button>
  )

  // ── Tab content renderers ──
  const renderProfile = () => (
    <>
      <h2 style={s.panelTitle}>Informations du profil</h2>
      <p style={s.panelSub}>Mettez à jour les détails de votre compte</p>

      <div style={s.avatarRow}>
        {student.avatar_url ? (
          <img src={student.avatar_url} alt="" style={s.avatarImg} />
        ) : (
          <div style={s.avatarFallback}>{getInitials(student.name)}</div>
        )}
        <div>
          <div style={s.avatarLabel}>Photo de profil</div>
          <div style={s.avatarHint}>JPG, PNG ou GIF. 2 Mo max.</div>
          <button style={s.changePhotoBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Envoi...' : 'Changer la photo'}
          </button>
          <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>
      </div>

      <div style={s.fieldRow}>
        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>PRÉNOM</label>
          <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>NOM</label>
          <input style={s.input} value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
      </div>

      <div style={s.fieldRow}>
        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>EMAIL</label>
          <input style={{ ...s.input, ...s.inputDisabled }} value={student.email} disabled />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>TÉLÉPHONE</label>
          <input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+212 6..." />
        </div>
      </div>

      <div style={s.fieldRow}>
        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>RÔLE</label>
          <input style={{ ...s.input, ...s.inputDisabled }} value={getRoleLabel(student.role)} disabled />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>IDENTIFIANT</label>
          <input
            style={{ ...s.input, ...s.inputDisabled, fontFamily: 'monospace', fontSize: 12 }}
            value={student.id}
            disabled
            onClick={() => navigator.clipboard.writeText(student.id)}
            title="Cliquer pour copier"
          />
        </div>
      </div>

      <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saved ? 'Enregistré !' : saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </>
  )

  const renderNotifications = () => (
    <>
      <h2 style={s.panelTitle}>Notifications</h2>
      <p style={s.panelSub}>Choisissez les notifications que vous souhaitez recevoir</p>

      {/* Master toggle */}
      <div style={s.toggleRow}>
        <div style={s.toggleLeft}>
          <div style={{ ...s.toggleIcon, background: prefs.all ? 'var(--brand)' : 'var(--bg-muted)' }}>
            {prefs.all ? <Bell size={15} color="#fff" /> : <BellOff size={15} color="var(--text-tertiary)" />}
          </div>
          <div>
            <div style={s.toggleLabelText}>Toutes les notifications</div>
            <div style={s.toggleHint}>Activer ou désactiver toutes les notifications</div>
          </div>
        </div>
        <Toggle on={prefs.all} onClick={() => updatePref('all', !prefs.all)} />
      </div>

      <div style={s.toggleGroupIndent}>
        {([
          { key: 'mentions' as keyof NotifPrefs, icon: AtSign, label: 'Mentions', hint: 'Quand quelqu\'un vous mentionne avec @' },
          { key: 'announcements' as keyof NotifPrefs, icon: Megaphone, label: 'Annonces', hint: 'Nouvelles annonces dans vos groupes' },
          { key: 'todos' as keyof NotifPrefs, icon: ClipboardList, label: 'Tâches', hint: 'Nouvelles tâches assignées' },
          { key: 'creativity' as keyof NotifPrefs, icon: Palette, label: 'Créativité', hint: 'Feedback sur vos travaux créatifs' },
          { key: 'native' as keyof NotifPrefs, icon: Monitor, label: 'Notifications système', hint: 'Pop-ups natifs de votre ordinateur' },
          { key: 'sound' as keyof NotifPrefs, icon: Volume2, label: 'Son', hint: 'Jouer un son pour les nouvelles notifications' },
        ]).map(({ key, icon: Icon, label, hint }) => (
          <div key={key} style={s.toggleRow}>
            <div style={s.toggleLeft}>
              <div style={{ ...s.toggleIconSm, color: prefs[key] ? 'var(--brand)' : 'var(--text-tertiary)' }}>
                <Icon size={14} />
              </div>
              <div>
                <div style={s.toggleLabelText}>{label}</div>
                <div style={s.toggleHint}>{hint}</div>
              </div>
            </div>
            <Toggle on={prefs[key]} onClick={() => updatePref(key, !prefs[key])} />
          </div>
        ))}
      </div>
    </>
  )

  const renderSecurity = () => (
    <>
      <h2 style={s.panelTitle}>Sécurité</h2>
      <p style={s.panelSub}>Gérez la sécurité de votre compte</p>

      <div style={s.secCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Lock size={16} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Changer le mot de passe</span>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.fieldLabel}>MOT DE PASSE ACTUEL</label>
          <div style={s.pwInputWrap}>
            <input
              style={{ ...s.input, paddingRight: 36 }}
              type={showPw ? 'text' : 'password'}
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="••••••••"
            />
            <button style={s.pwEye} onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div style={s.fieldRow}>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>NOUVEAU MOT DE PASSE</label>
            <input style={s.input} type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 caractères" />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>CONFIRMER</label>
            <input style={s.input} type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirmer" />
          </div>
        </div>

        {pwMsg && (
          <div style={{ fontSize: 12, fontWeight: 600, color: pwMsg.type === 'ok' ? 'var(--success)' : 'var(--error)', marginBottom: 12 }}>
            {pwMsg.text}
          </div>
        )}

        <button style={{ ...s.saveBtn, opacity: pwSaving ? 0.6 : 1 }} onClick={handleChangePassword} disabled={pwSaving}>
          {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          Modifier le mot de passe
        </button>
      </div>
    </>
  )

  const renderAppearance = () => (
    <>
      <h2 style={s.panelTitle}>Apparence</h2>
      <p style={s.panelSub}>Personnalisez l'apparence de l'application</p>

      <div style={s.themeCards}>
        <button
          style={{ ...s.themeCard, ...(isDark ? {} : s.themeCardActive) }}
          onClick={() => { if (isDark) toggleTheme() }}
        >
          <div style={{ ...s.themePreview, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ height: '100%', width: 50, background: '#fff', borderRight: '1px solid #e2e8f0' }} />
            <div style={{ flex: 1, padding: 8 }}>
              <div style={{ height: 6, width: '60%', background: '#e2e8f0', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 6, width: '80%', background: '#e2e8f0', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 6, width: '40%', background: '#e2e8f0', borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Sun size={14} style={{ color: isDark ? 'var(--text-tertiary)' : 'var(--brand)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? 'var(--text-secondary)' : 'var(--brand)' }}>Clair</span>
          </div>
        </button>

        <button
          style={{ ...s.themeCard, ...(isDark ? s.themeCardActive : {}) }}
          onClick={() => { if (!isDark) toggleTheme() }}
        >
          <div style={{ ...s.themePreview, background: '#0f1629', border: '1px solid #1e2a4a' }}>
            <div style={{ height: '100%', width: 50, background: '#0a0e19', borderRight: '1px solid #1e2a4a' }} />
            <div style={{ flex: 1, padding: 8 }}>
              <div style={{ height: 6, width: '60%', background: '#1e2a4a', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 6, width: '80%', background: '#1e2a4a', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 6, width: '40%', background: '#1e2a4a', borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Moon size={14} style={{ color: isDark ? 'var(--brand)' : 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? 'var(--brand)' : 'var(--text-secondary)' }}>Sombre</span>
          </div>
        </button>
      </div>
    </>
  )

  const renderUpdate = () => (
    <>
      <h2 style={s.panelTitle}>Mise à jour</h2>
      <p style={s.panelSub}>Vérifiez et installez les dernières mises à jour</p>

      <div style={s.secCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ ...s.toggleIcon, background: update.status === 'ready' ? 'var(--success)' : update.status === 'downloading' ? 'var(--warning, #f59e0b)' : 'var(--brand)' }}>
            {update.status === 'ready' ? <CheckCircle size={16} color="#fff" /> : update.status === 'downloading' ? <RefreshCw size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} color="#fff" />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {update.status === 'idle' && 'Aucune mise à jour disponible'}
              {update.status === 'available' && `Mise à jour v${update.version} disponible`}
              {update.status === 'downloading' && `Téléchargement en cours... ${update.progress}%`}
              {update.status === 'ready' && `Mise à jour v${update.version} prête`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Version actuelle : v{appVersion}
            </div>
          </div>
        </div>

        {update.status === 'downloading' && (
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${update.progress}%` }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {update.status === 'available' && (
            <button style={s.saveBtn} onClick={update.download}>
              <Download size={14} /> Télécharger
            </button>
          )}
          {update.status === 'ready' && (
            <button style={{ ...s.saveBtn, background: 'var(--success, #059669)' }} onClick={update.install}>
              <CheckCircle size={14} /> Installer et redémarrer
            </button>
          )}
          {update.status === 'idle' && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={13} style={{ color: 'var(--success, #059669)' }} />
              Vous utilisez la dernière version
            </div>
          )}
        </div>
      </div>
    </>
  )

  const renderAbout = () => (
    <>
      <h2 style={s.panelTitle}>À propos</h2>
      <p style={s.panelSub}>Informations sur l'application</p>

      <div style={s.aboutCard}>
        <img
          src={isDark ? './logo-dark.png' : './logo-light.png'}
          alt="GoxLearning"
          style={{ height: 32, objectFit: 'contain' as any, marginBottom: 16 }}
        />
        <div style={s.aboutRow}>
          <span style={s.aboutLabel}>Application</span>
          <span style={s.aboutValue}>GoxLearning Desktop</span>
        </div>
        <div style={s.aboutRow}>
          <span style={s.aboutLabel}>Version</span>
          <span style={s.aboutValue}>v{appVersion}</span>
        </div>
        <div style={s.aboutRow}>
          <span style={s.aboutLabel}>Plateforme</span>
          <span style={s.aboutValue}>{window.electronAPI?.platform === 'darwin' ? 'macOS' : window.electronAPI?.platform === 'win32' ? 'Windows' : 'Linux'}</span>
        </div>
        <div style={s.aboutRow}>
          <span style={s.aboutLabel}>Développeur</span>
          <span style={s.aboutValue}>GoxLearning</span>
        </div>
        <div style={s.aboutRow}>
          <span style={s.aboutLabel}>Site web</span>
          <button
            style={s.aboutLink}
            onClick={() => window.open('https://goxlearning.com', '_blank')}
          >
            goxlearning.com <ExternalLink size={11} />
          </button>
        </div>
        <div style={s.aboutRow}>
          <span style={s.aboutLabel}>Support</span>
          <button
            style={s.aboutLink}
            onClick={() => window.open('mailto:ya.goxlearning@gmail.com', '_blank')}
          >
            ya.goxlearning@gmail.com <ExternalLink size={11} />
          </button>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' as any }}>
          © {new Date().getFullYear()} GoxLearning. Tous droits réservés.
        </div>
      </div>
    </>
  )

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.pageHeader} className="titlebar-drag">
        <button style={s.backBtn} onClick={onBack} className="titlebar-nodrag">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={s.pageTitle}>Paramètres</h1>
          <p style={s.pageSub}>Gérez votre compte et vos préférences</p>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={s.body}>
        {/* Left settings nav */}
        <div style={s.settingsNav}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              style={{ ...s.navItem, ...(activeTab === key ? s.navItemActive : {}) }}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={s.contentScroll}>
          <div style={s.contentInner}>
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'appearance' && renderAppearance()}
            {activeTab === 'update' && renderUpdate()}
            {activeTab === 'about' && renderAbout()}
          </div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
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
    minHeight: 56,
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

  // Body layout
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    overflow: 'hidden',
  },
  settingsNav: {
    width: 200,
    flexShrink: 0,
    padding: '16px 12px',
    borderRight: '1px solid var(--border-light)',
    background: 'var(--bg-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as any,
    width: '100%',
  },
  navItemActive: {
    background: 'var(--brand)',
    color: '#fff',
    fontWeight: 700,
  },
  contentScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  contentInner: {
    maxWidth: 640,
    padding: '28px 36px 48px',
  },

  // Panel titles
  panelTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: '0 0 4px',
  },
  panelSub: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: '0 0 24px',
  },

  // Avatar
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 28,
    padding: '16px 0',
    borderBottom: '1px solid var(--border-light)',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    objectFit: 'cover' as any,
    border: '3px solid var(--border-light)',
    flexShrink: 0,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'var(--brand)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 800,
    flexShrink: 0,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  avatarHint: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 2,
    marginBottom: 8,
  },
  changePhotoBtn: {
    padding: '6px 14px',
    borderRadius: 7,
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
    marginBottom: 0,
  },
  fieldGroup: {
    flex: 1,
    marginBottom: 18,
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
    padding: '11px 14px',
    borderRadius: 10,
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
    marginTop: 4,
  },

  // Notification toggles
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: 10,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    marginBottom: 8,
  },
  toggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleIconSm: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 0.2s',
  },
  toggleLabelText: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  toggleHint: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 1,
  },
  toggleGroupIndent: {
    marginTop: 4,
    paddingLeft: 8,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    border: 'none',
    background: 'var(--bg-muted)',
    cursor: 'pointer',
    position: 'relative' as any,
    flexShrink: 0,
    transition: 'background 0.2s',
    padding: 0,
  },
  toggleOn: {
    background: 'var(--brand)',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute' as any,
    top: 3,
    left: 3,
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,.15)',
  },
  toggleKnobOn: {
    transform: 'translateX(18px)',
  },

  // Security
  secCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    padding: '20px 24px',
  },
  pwInputWrap: {
    position: 'relative' as any,
  },
  pwEye: {
    position: 'absolute' as any,
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },

  // Appearance
  themeCards: {
    display: 'flex',
    gap: 16,
  },
  themeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    border: '2px solid var(--border-light)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    textAlign: 'left' as any,
  },
  themeCardActive: {
    borderColor: 'var(--brand)',
    boxShadow: '0 0 0 2px rgba(0,42,161,.12)',
  },
  themePreview: {
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
  },

  // Update
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: 'var(--bg-main)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    background: 'var(--brand)',
    transition: 'width 0.3s ease',
  },

  // About
  aboutCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 12,
    padding: '24px 28px',
  },
  aboutRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-light)',
  },
  aboutLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  aboutLink: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brand)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: 'inherit',
    padding: 0,
  },
}
