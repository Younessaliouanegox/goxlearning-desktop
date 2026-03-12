import React, { useState, useEffect } from 'react'
import {
  X, Users, Calendar, Mail, Phone, BookOpen, Image, ArrowLeft,
  Hash, Shield, ChevronRight, UserCircle, Link as LinkIcon,
  ExternalLink, GraduationCap, Video, FolderOpen, Search,
  FileText, Copy, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Group } from '../types'

interface GroupInfoPanelProps {
  group: Group
  onClose: () => void
  isStaff?: boolean
}

interface EnrolledStudent {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  avatar_url?: string | null
}

interface Instructor {
  id: string
  name: string
  email: string
  avatar_url?: string | null
}

interface MediaItem {
  id: string
  file_url: string
  file_type: string
  created_at: string
  sender_name: string | null
}

type PanelTab = 'info' | 'students' | 'media'

const AVATAR_COLORS = ['#1a237e', '#0d47a1', '#00695c', '#2e7d32', '#e65100', '#6a1b9a', '#c62828', '#283593']

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function GroupInfoPanel({ group, onClose, isStaff }: GroupInfoPanelProps) {
  const [tab, setTab] = useState<PanelTab>('info')
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [sessionsCount, setSessionsCount] = useState(0)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null)

  useEffect(() => {
    fetchGroupInfo()
  }, [group.id])

  const fetchGroupInfo = async () => {
    setLoading(true)

    const [enrollRes, groupRes, countRes, mediaRes] = await Promise.all([
      supabase.from('enrollments').select('students(id, name, email, phone, status, avatar_url)').eq('group_id', group.id),
      supabase.from('groups').select('instructors(id, name, email, avatar_url)').eq('id', group.id).maybeSingle(),
      supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('group_id', group.id),
      supabase.from('group_messages').select('id, file_url, file_type, created_at, sender_name')
        .eq('group_id', group.id).not('file_url', 'is', null).order('created_at', { ascending: false }).limit(50),
    ])

    setStudents((enrollRes.data || []).map((e: any) => e.students).filter(Boolean))
    if (groupRes.data?.instructors) {
      const inst = Array.isArray(groupRes.data.instructors) ? groupRes.data.instructors[0] : groupRes.data.instructors
      setInstructor(inst || null)
    }
    setSessionsCount(countRes.count || 0)
    setMedia((mediaRes.data || []) as MediaItem[])
    setLoading(false)
  }

  // Student detail sub-view
  if (selectedStudent) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setSelectedStudent(null)}>
            <ArrowLeft size={16} />
          </button>
          <h2 style={styles.headerTitle}>Profil étudiant</h2>
          <button style={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={styles.scrollArea}>
          <div style={styles.studentDetailHeader}>
            {selectedStudent.avatar_url ? (
              <img src={selectedStudent.avatar_url} alt="" style={{ ...styles.bigAvatar, objectFit: 'cover' as any }} />
            ) : (
              <div style={{ ...styles.bigAvatar, background: AVATAR_COLORS[selectedStudent.name.length % AVATAR_COLORS.length] }}>
                {getInitials(selectedStudent.name)}
              </div>
            )}
            <div style={styles.studentDetailName}>{selectedStudent.name}</div>
            <span style={{
              ...styles.statusPillLg,
              background: selectedStudent.status === 'Actif' ? 'rgba(5,150,105,.15)' : 'rgba(220,38,38,.15)',
              color: selectedStudent.status === 'Actif' ? '#10b981' : '#f87171',
            }}>
              <CheckCircle2 size={11} />
              {selectedStudent.status}
            </span>
          </div>
          <div style={styles.detailRows}>
            <DetailRow icon={Hash} label="ID" value={selectedStudent.id.slice(0, 8) + '...'} copyValue={selectedStudent.id} />
            <DetailRow icon={Mail} label="Email" value={selectedStudent.email} />
            <DetailRow icon={Phone} label="Téléphone" value={selectedStudent.phone || 'Non renseigné'} />
            <DetailRow icon={Shield} label="Statut" value={selectedStudent.status} />
          </div>
        </div>
      </div>
    )
  }

  const TABS: { key: PanelTab; label: string; count?: number }[] = [
    { key: 'info', label: 'Infos' },
    { key: 'students', label: 'Étudiants', count: students.length },
    { key: 'media', label: 'Média', count: media.length },
  ]

  return (
    <div style={styles.panel}>
      {/* Hero header */}
      <div style={styles.heroHeader}>
        <button style={styles.heroClose} onClick={onClose}><X size={16} /></button>
        <div style={styles.heroAvatar}>
          {group.image_url
            ? <img src={group.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 18, objectFit: 'cover' }} />
            : group.name.charAt(0).toUpperCase()
          }
        </div>
        <div style={styles.heroName}>{group.name}</div>
        {group.courses?.name && (
          <div style={styles.heroCourse}>
            <BookOpen size={11} /> {group.courses.name}
          </div>
        )}
        <div style={styles.heroMeta}>
          {students.length} membres
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.key}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                ...styles.tabCount,
                ...(tab === t.key ? styles.tabCountActive : {}),
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.scrollArea}>
        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.loadingDot} />
            Chargement...
          </div>
        ) : tab === 'info' ? (
          <InfoTab group={group} instructor={instructor} studentsCount={students.length} sessionsCount={sessionsCount} />
        ) : tab === 'students' ? (
          <StudentsTab students={students} isStaff={isStaff} onSelect={isStaff ? setSelectedStudent : undefined} />
        ) : (
          <MediaTab media={media} />
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────── */

function DetailRow({ icon: Icon, label, value, copyValue }: { icon: any; label: string; value: string; copyValue?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (!copyValue) return
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={styles.detailRow}>
      <div style={styles.detailIcon}><Icon size={14} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.detailLabel}>{label}</div>
        <div style={styles.detailValue}>{value}</div>
      </div>
      {copyValue && (
        <button style={styles.copyBtn} onClick={handleCopy} title="Copier">
          {copied ? <CheckCircle2 size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}

function InfoTab({ group, instructor, studentsCount, sessionsCount }: {
  group: Group; instructor: Instructor | null; studentsCount: number; sessionsCount: number
}) {
  return (
    <div style={{ padding: '0 16px' }}>
      {group.description && (
        <p style={styles.infoDesc}>{group.description}</p>
      )}

      {/* Stats row */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrap, background: 'var(--brand-light)', color: 'var(--brand)' }}>
            <Users size={15} />
          </div>
          <div>
            <div style={styles.statNum}>{studentsCount}</div>
            <div style={styles.statLabel}>Étudiants</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrap, background: 'var(--purple-bg)', color: 'var(--purple)' }}>
            <Calendar size={15} />
          </div>
          <div>
            <div style={styles.statNum}>{sessionsCount}</div>
            <div style={styles.statLabel}>Séances</div>
          </div>
        </div>
      </div>

      {/* Instructor */}
      {instructor && (
        <>
          <div style={styles.sectionLabel}>FORMATEUR</div>
          <div style={styles.instructorCard}>
            {instructor.avatar_url ? (
              <img src={instructor.avatar_url} alt="" style={{ ...styles.instructorAvatar, objectFit: 'cover' as any }} />
            ) : (
              <div style={styles.instructorAvatar}>
                {getInitials(instructor.name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.instructorName}>{instructor.name}</div>
              <div style={styles.instructorEmail}>{instructor.email}</div>
            </div>
            <div style={styles.instructorBadge}>
              <GraduationCap size={11} /> Formateur
            </div>
          </div>
        </>
      )}

      {/* Links */}
      {(group.drive_link || group.meet_link) && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: 16 }}>RESSOURCES</div>
          <div style={styles.linksGrid}>
            {group.drive_link && (
              <a href={group.drive_link} target="_blank" rel="noreferrer" style={styles.linkCard}>
                <div style={{ ...styles.linkIconWrap, background: '#E3F2FD', color: '#1565C0' }}>
                  <FolderOpen size={15} />
                </div>
                <div style={styles.linkCardLabel}>OneDrive</div>
                <ExternalLink size={11} style={{ color: 'var(--text-tertiary)' }} />
              </a>
            )}
            {group.meet_link && (
              <a href={group.meet_link} target="_blank" rel="noreferrer" style={styles.linkCard}>
                <div style={{ ...styles.linkIconWrap, background: '#E8F5E9', color: '#2E7D32' }}>
                  <Video size={15} />
                </div>
                <div style={styles.linkCardLabel}>Google Meet</div>
                <ExternalLink size={11} style={{ color: 'var(--text-tertiary)' }} />
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StudentsTab({ students, isStaff, onSelect }: {
  students: EnrolledStudent[]; isStaff?: boolean; onSelect?: (s: EnrolledStudent) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = search.length >= 2
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
    : students

  if (students.length === 0) return (
    <div style={styles.emptyState}>
      <Users size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4, marginBottom: 8 }} />
      Aucun étudiant inscrit
    </div>
  )

  return (
    <>
      {students.length > 4 && (
        <div style={styles.searchBox}>
          <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            placeholder="Rechercher un étudiant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}
      <div style={{ padding: '4px 0' }}>
        {filtered.map((s, i) => (
          <div
            key={s.id}
            style={{ ...styles.studentRow, cursor: onSelect ? 'pointer' : 'default' }}
            onClick={() => onSelect?.(s)}
          >
            {s.avatar_url ? (
              <img src={s.avatar_url} alt="" style={{ ...styles.personAvatar, objectFit: 'cover' as any }} />
            ) : (
              <div style={{ ...styles.personAvatar, background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                {getInitials(s.name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.personName}>{s.name}</div>
              {isStaff && <div style={styles.personSub}>{s.email}</div>}
            </div>
            <span style={{
              ...styles.statusDot,
              background: s.status === 'Actif' ? 'var(--success)' : 'var(--error)',
            }} title={s.status} />
            {onSelect && <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.5 }} />}
          </div>
        ))}
        {filtered.length === 0 && search && (
          <div style={styles.emptyState}>Aucun résultat pour "{search}"</div>
        )}
      </div>
    </>
  )
}

function MediaTab({ media }: { media: MediaItem[] }) {
  if (media.length === 0) return (
    <div style={styles.emptyState}>
      <Image size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4, marginBottom: 8 }} />
      Aucun média partagé
    </div>
  )
  const images = media.filter(m => m.file_type?.startsWith('image'))
  const files = media.filter(m => !m.file_type?.startsWith('image'))
  return (
    <>
      {images.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, padding: '8px 16px 8px' }}>IMAGES ({images.length})</div>
          <div style={styles.mediaGrid}>
            {images.map(m => (
              <div key={m.id} style={styles.mediaThumbWrap}>
                <img
                  src={m.file_url}
                  alt=""
                  style={styles.mediaThumbnail}
                  onClick={() => window.open(m.file_url, '_blank')}
                />
              </div>
            ))}
          </div>
        </>
      )}
      {files.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: 14, padding: '8px 16px 6px' }}>FICHIERS ({files.length})</div>
          <div style={{ padding: '0 12px' }}>
            {files.map(m => (
              <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" style={styles.fileRow}>
                <div style={styles.fileIcon}><FileText size={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.fileName}>{m.file_url.split('/').pop()?.slice(0, 28) || 'Fichier'}</div>
                  <div style={styles.fileMeta}>{m.sender_name || 'Inconnu'} · {new Date(m.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <ExternalLink size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0, opacity: 0.5 }} />
              </a>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ── Styles ──────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 'clamp(280px, 30vw, 360px)',
    maxWidth: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-card)',
    borderLeft: '1px solid var(--border-light)',
    flexShrink: 0,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-light)',
    minHeight: 52,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  closeBtn: {
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

  // Hero header
  heroHeader: {
    position: 'relative' as any,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 16px 18px',
    background: 'linear-gradient(145deg, var(--brand) 0%, #0d1a5c 100%)',
  },
  heroClose: {
    position: 'absolute' as any,
    top: 10,
    right: 10,
    background: 'rgba(255,255,255,.12)',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,.7)',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    background: 'rgba(255,255,255,.15)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 800,
    border: '2.5px solid rgba(255,255,255,.25)',
    marginBottom: 10,
    backdropFilter: 'blur(4px)',
  },
  heroName: {
    fontSize: 16,
    fontWeight: 800,
    color: '#fff',
    textAlign: 'center' as any,
    marginBottom: 2,
  },
  heroCourse: {
    fontSize: 11,
    color: 'rgba(255,255,255,.6)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  heroMeta: {
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(255,255,255,.4)',
    letterSpacing: '0.03em',
  },

  // Tabs
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--border-light)',
    padding: '0 12px',
    background: 'var(--bg-card)',
  },
  tab: {
    flex: 1,
    padding: '11px 0',
    background: 'none',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  tabActive: {
    color: 'var(--brand)',
    borderBottomColor: 'var(--brand)',
  },
  tabCount: {
    fontSize: 9,
    fontWeight: 800,
    background: 'var(--bg-muted)',
    color: 'var(--text-tertiary)',
    padding: '2px 6px',
    borderRadius: 99,
    minWidth: 18,
    textAlign: 'center' as any,
  },
  tabCountActive: {
    background: 'var(--brand-light)',
    color: 'var(--brand)',
  },

  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 0',
  },

  // Info tab
  infoDesc: {
    fontSize: 12,
    lineHeight: '18px',
    color: 'var(--text-secondary)',
    margin: '0 0 14px',
    padding: '10px 14px',
    background: 'var(--bg-muted)',
    borderRadius: 10,
    borderLeft: '3px solid var(--brand)',
  },
  statsGrid: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 12px',
    borderRadius: 12,
    background: 'var(--bg-main)',
    border: '1px solid var(--border-light)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statNum: {
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    marginTop: 2,
  },

  // Instructor
  instructorCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px',
    borderRadius: 12,
    background: 'var(--bg-main)',
    border: '1px solid var(--border-light)',
    marginBottom: 4,
  },
  instructorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    background: 'linear-gradient(135deg, var(--brand) 0%, #1a3a8f 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  instructorName: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  instructorEmail: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 1,
  },
  instructorBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 9,
    fontWeight: 700,
    color: 'var(--brand)',
    background: 'var(--brand-light)',
    padding: '3px 8px',
    borderRadius: 99,
    flexShrink: 0,
  },

  // Links
  linksGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  linkCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'var(--bg-main)',
    border: '1px solid var(--border-light)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  linkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  linkCardLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },

  // Shared
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.08em',
    padding: '12px 0 8px',
    textTransform: 'uppercase' as any,
  },

  // Students
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 12px 8px',
    padding: '8px 12px',
    borderRadius: 10,
    background: 'var(--bg-muted)',
    border: '1px solid var(--border-light)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  },
  studentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    transition: 'background 0.1s',
    borderRadius: 0,
  },
  personAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  personName: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  personSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },

  // Media grid
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 3,
    padding: '0 12px',
  },
  mediaThumbWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: '1/1',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
    cursor: 'pointer',
    transition: 'transform 0.15s',
    display: 'block',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 10,
    textDecoration: 'none',
    transition: 'background 0.1s',
    marginBottom: 2,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--purple-bg)',
    color: 'var(--purple)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileName: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileMeta: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    marginTop: 1,
  },

  // Student detail
  studentDetailHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px 22px',
    background: 'linear-gradient(145deg, var(--brand) 0%, #0d1a5c 100%)',
    borderRadius: '0 0 20px 20px',
    marginBottom: 16,
  },
  bigAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 800,
    border: '3px solid rgba(255,255,255,0.2)',
    marginBottom: 10,
    backdropFilter: 'blur(4px)',
  },
  studentDetailName: {
    fontSize: 16,
    fontWeight: 800,
    color: '#fff',
    marginBottom: 8,
  },
  statusPillLg: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 99,
  },
  detailRows: {
    padding: '0 16px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 0',
    borderBottom: '1px solid var(--border-light)',
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'var(--brand-light)',
    color: 'var(--brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as any,
    letterSpacing: '0.05em',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginTop: 1,
  },
  copyBtn: {
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

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  loadingDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2.5px solid var(--border-light)',
    borderTopColor: 'var(--brand)',
    animation: 'spin 0.6s linear infinite',
    marginBottom: 10,
  },
}
