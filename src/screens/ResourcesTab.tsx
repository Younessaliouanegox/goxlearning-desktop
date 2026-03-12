import React, { useState, useEffect } from 'react'
import { Play, Video, Clock, Calendar, FolderOpen, CheckCircle2, HardDrive, MonitorPlay, ExternalLink, ListTodo, Copy, Link, Check, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canManageResources } from '../lib/roles'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'
import Modal from '../components/Modal'
import Empty from '../components/Empty'
import Loading from '../components/Loading'
import type { Group, Student, SessionRecord } from '../types'

interface ResourcesTabProps {
  group: Group | null
  student?: Student
}

export default function ResourcesTab({ group, student }: ResourcesTabProps) {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)
  const [recordingModal, setRecordingModal] = useState<{ sessionId: string; current: string } | null>(null)
  const [recordingUrl, setRecordingUrl] = useState('')

  const canManage = canManageResources(student?.role)

  const markSessionDone = async (sessionId: string) => {
    await supabase.from('sessions').update({ status: 'Completed' }).eq('id', sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'Completed' } : s))
  }

  const saveRecordingUrl = async () => {
    if (!recordingModal || !recordingUrl.trim()) return
    await supabase.from('sessions').update({ recording_url: recordingUrl.trim() }).eq('id', recordingModal.sessionId)
    setSessions(prev => prev.map(s => s.id === recordingModal.sessionId ? { ...s, recording_url: recordingUrl.trim() } : s))
    setRecordingModal(null)
    setRecordingUrl('')
  }

  useEffect(() => {
    if (!group) return
    setLoading(true)
    supabase
      .from('sessions')
      .select('id, title, session_date, day_of_week, start_time, end_time, recording_url, status, has_todo')
      .eq('group_id', group.id)
      .order('session_date', { ascending: true })
      .then(({ data }) => {
        setSessions(data || [])
        setLoading(false)
      })
  }, [group])

  if (!group) return <Empty icon={FolderOpen} text="Sélectionnez un groupe" sub="Choisissez un groupe dans la barre latérale" />
  if (loading) return <Loading />

  const withRecording = sessions.filter((s) => s.recording_url).length
  const completed = sessions.filter((s) => s.status === 'Completed').length

  const handleSessionCtx = (e: React.MouseEvent, s: SessionRecord) => {
    e.preventDefault()
    const items: ContextMenuItem[] = [
      { label: 'Copier le titre', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(s.title) },
    ]
    if (s.recording_url) {
      items.push(
        { label: 'Ouvrir l\'enregistrement', icon: <Play size={14} />, onClick: () => window.open(s.recording_url!, '_blank') },
        { label: 'Copier le lien', icon: <Link size={14} />, onClick: () => navigator.clipboard.writeText(s.recording_url!) },
      )
    }
    if (canManage) {
      if (s.status !== 'Completed') {
        items.push({ label: 'Marquer terminée', icon: <Check size={14} />, divider: true, onClick: () => markSessionDone(s.id) })
      }
      items.push({ label: s.recording_url ? 'Modifier l\'enregistrement' : 'Ajouter enregistrement', icon: <Link2 size={14} />, onClick: () => { setRecordingModal({ sessionId: s.id, current: s.recording_url || '' }); setRecordingUrl(s.recording_url || '') } })
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, items })
  }

  const handleLinkCtx = (e: React.MouseEvent, url: string, label: string) => {
    e.preventDefault()
    setCtxMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: `Ouvrir ${label}`, icon: <ExternalLink size={14} />, onClick: () => window.open(url, '_blank') },
        { label: 'Copier le lien', icon: <Link size={14} />, onClick: () => navigator.clipboard.writeText(url) },
      ],
    })
  }

  const groupLinks = [
    { label: 'OneDrive', url: group.drive_link, icon: HardDrive, color: '#0078D4', bg: '#E5F1FB' },
    { label: 'Google Meet', url: group.meet_link, icon: MonitorPlay, color: '#00796B', bg: '#E0F2F1' },
  ].filter((l) => l.url)

  return (
    <div style={styles.scroll}>
      {/* Group links */}
      {groupLinks.length > 0 && (
        <>
          <div style={styles.sectionLabel}>LIENS DU GROUPE</div>
          <div style={styles.linksRow}>
            {groupLinks.map((link) => {
              const Icon = link.icon
              return (
                <button
                  key={link.label}
                  style={{ ...styles.linkCard, borderColor: link.bg }}
                  className="card"
                  onClick={() => window.open(link.url!, '_blank')}
                  onContextMenu={(e) => handleLinkCtx(e, link.url!, link.label)}
                >
                  <div style={{ ...styles.linkIcon, background: link.bg, color: link.color }}>
                    <Icon size={16} />
                  </div>
                  <span style={styles.linkLabel}>{link.label}</span>
                  <ExternalLink size={12} style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }} />
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Stats */}
      <div style={styles.sectionLabel}>SÉANCES</div>
      <div style={styles.statsRow}>
        {[
          { label: 'Total séances', value: sessions.length, icon: Calendar, color: 'var(--brand)', bg: 'var(--brand-light)' },
          { label: 'Enregistrements', value: withRecording, icon: Video, color: 'var(--success)', bg: 'var(--success-bg)' },
          { label: 'Terminées', value: completed, icon: CheckCircle2, color: 'var(--blue)', bg: 'var(--blue-bg)' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} style={styles.statCard} className="card">
              <div style={{ ...styles.statIcon, background: s.bg, color: s.color }}>
                <Icon size={16} />
              </div>
              <div>
                <div style={styles.statNum}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Session list */}
      {sessions.length === 0 && <Empty icon={FolderOpen} text="Aucune séance" />}
      <div style={styles.list}>
        {sessions.map((s, i) => (
          <SessionCard key={s.id} session={s} index={i} onContextMenu={(e) => handleSessionCtx(e, s)} />
        ))}
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {/* Recording URL modal (teacher/admin only) */}
      {recordingModal && (
        <Modal visible title="Lien d'enregistrement" onClose={() => { setRecordingModal(null); setRecordingUrl('') }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>URL de l'enregistrement</label>
            <input
              autoFocus
              style={{ width: '100%', background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }}
              placeholder="https://..."
              value={recordingUrl}
              onChange={e => setRecordingUrl(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setRecordingModal(null); setRecordingUrl('') }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--bg-muted)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>Annuler</button>
            <button onClick={saveRecordingUrl} disabled={!recordingUrl.trim()} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'var(--brand)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#fff', fontFamily: 'inherit', opacity: recordingUrl.trim() ? 1 : 0.5 }}>Enregistrer</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Completed': return { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Terminée' }
    case 'Cancelled': return { bg: 'var(--error-bg)', color: 'var(--error)', label: 'Annulée' }
    default: return { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Planifiée' }
  }
}

function SessionCard({ session, index, onContextMenu }: { session: SessionRecord; index: number; onContextMenu?: (e: React.MouseEvent) => void }) {
  const hasRecording = !!session.recording_url
  const statusStyle = getStatusStyle(session.status)
  const formattedDate = session.session_date
    ? new Date(session.session_date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : session.day_of_week || '—'

  const timeStr = session.start_time && session.end_time
    ? `${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`
    : null

  return (
    <div
      style={{
        ...styles.card,
        cursor: hasRecording ? 'pointer' : 'default',
        animationDelay: `${index * 30}ms`,
      }}
      className="card animate-fade-in"
      onClick={() => hasRecording && window.open(session.recording_url!, '_blank')}
      onContextMenu={onContextMenu}
    >
      <div style={{
        ...styles.sessionNum,
        background: session.status === 'Completed' ? 'var(--success-bg)' : 'var(--bg-muted)',
        color: session.status === 'Completed' ? 'var(--success)' : 'var(--text-tertiary)',
      }}>
        {session.status === 'Completed' ? <CheckCircle2 size={16} /> : String(index + 1).padStart(2, '0')}
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{session.title}</div>
        <div style={styles.cardMeta}>
          <Calendar size={11} />
          {formattedDate}
          {timeStr && (
            <>
              <Clock size={11} />
              {timeStr}
            </>
          )}
          <span style={{
            ...styles.statusPill,
            background: statusStyle.bg,
            color: statusStyle.color,
          }}>
            {statusStyle.label}
          </span>
          {hasRecording && (
            <span style={{
              ...styles.statusPill,
              background: 'var(--brand-light)',
              color: 'var(--brand)',
            }}>
              Enregistrement
            </span>
          )}
        </div>
      </div>
      {/* Icons for recording & todo */}
      <div style={styles.iconGroup}>
        {session.has_todo && (
          <div style={{ ...styles.miniIcon, background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <ListTodo size={14} />
          </div>
        )}
        {hasRecording && (
          <div style={styles.playBtn}>
            <Play size={14} />
          </div>
        )}
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  linksRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
  },
  linkCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    border: 'none',
    cursor: 'pointer',
    background: 'var(--bg-card)',
    borderRadius: 12,
    transition: 'all 0.15s ease',
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statNum: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 1,
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    transition: 'all 0.15s ease',
  },
  sessionNum: {
    width: 36,
    height: 36,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
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
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  statusPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 99,
  },
  iconGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: 'var(--brand-light)',
    color: 'var(--brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
}
