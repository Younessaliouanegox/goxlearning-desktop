import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react'
import {
  MessageSquare, Megaphone, Palette, FolderOpen, Headphones,
  Search, MoreVertical, X, Users, Bell, ClipboardList, Menu,
  Download, RefreshCw, Video,
} from 'lucide-react'
import { useGroups } from '../lib/hooks/useGroups'
import { useNotifications } from '../lib/hooks/useNotifications'
import Sidebar from '../layouts/Sidebar'
import GeneralTab from './GeneralTab'
const AnnoncesTab = lazy(() => import('./AnnoncesTab'))
const CreativityTab = lazy(() => import('./CreativityTab'))
const ResourcesTab = lazy(() => import('./ResourcesTab'))
const SupportTab = lazy(() => import('./SupportTab'))
const TodoTab = lazy(() => import('./TodoTab'))
const ProfileScreen = lazy(() => import('./ProfileScreen'))
import GroupInfoPanel from '../components/GroupInfoPanel'
import NotificationPanel from '../components/NotificationPanel'
import type { Student, Tab } from '../types'
import { isStaff as checkStaff } from '../lib/roles'
import { useUpdateChecker } from '../lib/hooks/useUpdateChecker'
import { useUnreadCounts } from '../lib/hooks/useUnreadCounts'
import { useTodoReminders } from '../lib/hooks/useTodoReminders'
import { useLastSeen } from '../lib/hooks/useLastSeen'

interface MainScreenProps {
  student: Student
  onSignOut: () => void
}

const TAB_META: Record<Tab, { label: string; icon: React.ComponentType<any>; desc: string }> = {
  general: { label: 'Discussion', icon: MessageSquare, desc: 'Chat de groupe' },
  annonces: { label: 'Annonces', icon: Megaphone, desc: 'Annonces importantes' },
  creativity: { label: 'Créativité', icon: Palette, desc: 'Travaux créatifs' },
  resources: { label: 'Ressources', icon: FolderOpen, desc: 'Sessions & enregistrements' },
  todos: { label: 'Tâches', icon: ClipboardList, desc: 'Liste de tâches' },
  support: { label: 'Support', icon: Headphones, desc: 'Contacter le support' },
}


function getGroupInitial(name: string) { return name.charAt(0).toUpperCase() }

const GROUP_COLORS = ['#1a237e', '#0d47a1', '#00695c', '#2e7d32', '#e65100', '#6a1b9a', '#c62828', '#283593']

const SIDEBAR_BREAKPOINT = 768

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-tertiary)', fontSize: 13 }}>
      Chargement...
    </div>
  )
}

export default function MainScreen({ student: initialStudent, onSignOut }: MainScreenProps) {
  const [student, setStudent] = useState(initialStudent)
  const { groups, selectedGroup, setSelectedGroup } = useGroups(student.id, student.role)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [showProfile, setShowProfile] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < SIDEBAR_BREAKPOINT
      setIsNarrow(narrow)
      if (!narrow) setSidebarOpen(true)
      if (narrow) setSidebarOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const closeSidebarIfNarrow = useCallback(() => {
    if (isNarrow) setSidebarOpen(false)
  }, [isNarrow])

  const groupIds = useMemo(() => groups.map(g => g.id), [groups])
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(student.id, student.name, groupIds)
  const { unreadCounts, markTabSeen } = useUnreadCounts(selectedGroup?.id)

  // Todo deadline reminders & last-seen tracking
  useTodoReminders(groupIds)
  useLastSeen(student.id)

  const isStaff = checkStaff(student.role)
  const meta = TAB_META[activeTab]
  const groupIdx = groups.findIndex(g => g.id === selectedGroup?.id)
  const update = useUpdateChecker()

  // Global keyboard shortcuts
  useEffect(() => {
    const TABS: Tab[] = ['general', 'annonces', 'creativity', 'resources', 'todos', 'support']
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
        return
      }
      if (mod && e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        if (TABS[idx]) {
          setShowProfile(false)
          setActiveTab(TABS[idx])
          markTabSeen(TABS[idx])
        }
        return
      }
      if (e.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); setSearchQuery(''); return }
        if (showGroupInfo) { setShowGroupInfo(false); return }
        if (showNotifs) { setShowNotifs(false); return }
        if (showMenu) { setShowMenu(false); return }
        if (showProfile) { setShowProfile(false); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, showGroupInfo, showNotifs, showMenu, showProfile, markTabSeen])

  const sidebarEl = (
    <>
      {isNarrow && sidebarOpen && (
        <div
          style={styles.sidebarBackdrop}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div style={{
        ...styles.sidebarWrapper,
        ...(isNarrow ? styles.sidebarOverlay : {}),
        transform: isNarrow && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>
        <Sidebar
          student={student}
          groups={groups}
          selectedGroupId={selectedGroup?.id}
          activeTab={activeTab}
          onSelectGroup={(g) => { setSelectedGroup(g); closeSidebarIfNarrow() }}
          onTabChange={(tab) => { setShowProfile(false); setActiveTab(tab); markTabSeen(tab); closeSidebarIfNarrow() }}
          unreadCounts={unreadCounts}
          onSignOut={onSignOut}
          onProfileClick={() => { setShowProfile(true); closeSidebarIfNarrow() }}
        />
      </div>
    </>
  )

  if (showProfile) {
    return (
      <div style={styles.layout}>
        {sidebarEl}
        <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader /></div>}>
          <ProfileScreen
            student={student}
            onBack={() => setShowProfile(false)}
            onUpdateAvatar={(url) => setStudent({ ...student, avatar_url: url })}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <div style={styles.layout}>

      {sidebarEl}

      <div style={styles.main}>
        {/* ── Telegram-style header ── */}
        <div style={styles.header} className="titlebar-drag">
          <div style={styles.headerLeft} className="titlebar-nodrag">
            {/* Hamburger menu (narrow screens) */}
            {isNarrow && (
              <button
                style={styles.iconBtn}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title="Menu"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <Menu size={18} />
              </button>
            )}
            {/* Group avatar */}
            {selectedGroup ? (
              <div style={{ ...styles.headerAvatar, background: GROUP_COLORS[Math.abs(groupIdx) % GROUP_COLORS.length] }}>
                {selectedGroup.image_url
                  ? <img src={selectedGroup.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                  : getGroupInitial(selectedGroup.name)
                }
              </div>
            ) : (
              <div style={{ ...styles.headerAvatar, background: 'var(--brand)' }}>
                {React.createElement(meta.icon, { size: 18 })}
              </div>
            )}
            <div style={styles.headerInfo}>
              <h1 style={styles.headerTitle}>
                {selectedGroup ? selectedGroup.name : meta.label}
              </h1>
              <p style={styles.headerSub}>
                {selectedGroup
                  ? (selectedGroup.courses?.name || meta.desc)
                  : meta.desc
                }
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div style={styles.headerRight} className="titlebar-nodrag">
            {/* Update button */}
            {update.status !== 'idle' && (
              <button
                style={{
                  ...styles.updateBtn,
                  ...(update.status === 'downloading' ? styles.updateBtnDownloading : {}),
                  ...(update.status === 'ready' ? styles.updateBtnReady : {}),
                }}
                onClick={() => {
                  if (update.status === 'available') update.download()
                  else if (update.status === 'ready') update.install()
                }}
                onMouseEnter={e => {
                  if (update.status !== 'downloading') {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(5,150,105,0.4)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onMouseDown={e => { if (update.status !== 'downloading') e.currentTarget.style.transform = 'scale(0.95)' }}
                onMouseUp={e => { if (update.status !== 'downloading') e.currentTarget.style.transform = 'scale(1.05)' }}
                title={
                  update.status === 'available' ? `Mise à jour ${update.version} disponible — Cliquez pour télécharger`
                    : update.status === 'downloading' ? `Téléchargement... ${update.progress}%`
                    : `Mise à jour prête — Cliquez pour installer`
                }
              >
                {update.status === 'downloading' ? (
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download size={13} />
                )}
                <span style={styles.updateLabel}>
                  {update.status === 'available' && `v${update.version}`}
                  {update.status === 'downloading' && `${update.progress}%`}
                  {update.status === 'ready' && 'Installer'}
                </span>
              </button>
            )}

            {/* Google Meet quick join */}
            {selectedGroup?.meet_link && (
              <button
                style={styles.meetBtn}
                onClick={() => window.open(selectedGroup.meet_link!, '_blank')}
                title="Rejoindre Google Meet"
                onMouseEnter={e => { e.currentTarget.style.background = '#00796B'; e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#00897B'; e.currentTarget.style.transform = 'scale(1)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
              >
                <Video size={14} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Meet</span>
              </button>
            )}

            {/* Search toggle */}
            {searchOpen ? (
              <div style={styles.searchBar}>
                <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  autoFocus
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                />
                <button
                  style={styles.iconBtn}
                  onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                style={styles.iconBtn}
                onClick={() => setSearchOpen(true)}
                title="Rechercher"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <Search size={16} />
              </button>
            )}

            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button
                style={styles.iconBtn}
                onClick={() => setShowNotifs(!showNotifs)}
                title="Notifications"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <div style={styles.notifBadge} className="animate-badge-pop">{unreadCount > 9 ? '9+' : unreadCount}</div>
                )}
              </button>
              {showNotifs && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifs(false)}
                  onMarkAllRead={markAllRead}
                  onMarkRead={markRead}
                />
              )}
            </div>

            {/* 3-dot menu */}
            {selectedGroup && (
              <div style={{ position: 'relative' }}>
                <button
                  style={styles.iconBtn}
                  onClick={() => setShowMenu(!showMenu)}
                  title="Menu"
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.9)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <MoreVertical size={16} />
                </button>
                {showMenu && (
                  <>
                    <div style={styles.menuBackdrop} onClick={() => setShowMenu(false)} />
                    <div style={styles.dropMenu} className="animate-scale-in">
                      <button
                        style={styles.dropItem}
                        onClick={() => { setShowGroupInfo(!showGroupInfo); setShowMenu(false) }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.color = 'var(--brand)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      >
                        <Users size={14} /> Infos du groupe
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab content + optional right panel */}
        <div style={styles.contentRow}>
          <div style={styles.content} className="animate-fade-in">
            {activeTab === 'general' && (
              <GeneralTab
                group={selectedGroup}
                student={student}
                groups={groups}
                searchQuery={searchQuery}
              />
            )}
            <Suspense fallback={<Loader />}>
              {activeTab === 'annonces' && <AnnoncesTab group={selectedGroup} student={student} />}
              {activeTab === 'creativity' && <CreativityTab group={selectedGroup} student={student} />}
              {activeTab === 'resources' && <ResourcesTab group={selectedGroup} student={student} />}
              {activeTab === 'todos' && <TodoTab group={selectedGroup} student={student} />}
              {activeTab === 'support' && <SupportTab student={student} />}
            </Suspense>
          </div>

          {showGroupInfo && selectedGroup && (
            <GroupInfoPanel group={selectedGroup} onClose={() => setShowGroupInfo(false)} isStaff={isStaff} />
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    height: '100vh',
    background: 'var(--bg-main)',
    position: 'relative' as any,
    overflow: 'hidden',
  },
  sidebarWrapper: {
    flexShrink: 0,
    transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
    willChange: 'transform',
    zIndex: 20,
  },
  sidebarOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 50,
  },
  sidebarBackdrop: {
    position: 'fixed' as any,
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 49,
    animation: 'fadeIn 0.2s ease both',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },

  /* ── Header ── */
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    paddingTop: 44,
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-light)',
    minHeight: 54,
    gap: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
    overflow: 'hidden',
  },
  headerInfo: {
    minWidth: 0,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  headerSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    margin: 0,
    marginTop: 1,
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s cubic-bezier(.4,0,.2,1)',
    flexShrink: 0,
    position: 'relative' as any,
    willChange: 'transform, background, color',
  },
  notifBadge: {
    position: 'absolute' as any,
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 99,
    background: '#EF4444',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
    border: '2px solid var(--bg-card)',
  },

  /* Update button */
  updateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    padding: '0 12px',
    borderRadius: 99,
    border: 'none',
    background: '#059669',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
    willChange: 'transform',
    flexShrink: 0,
    whiteSpace: 'nowrap' as any,
  },
  updateBtnDownloading: {
    background: '#0d9488',
    cursor: 'default',
    opacity: 0.9,
  },
  updateBtnReady: {
    background: '#16a34a',
    animation: 'pulse 1.5s ease infinite',
  },
  meetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    height: 30,
    padding: '0 12px',
    borderRadius: 99,
    border: 'none',
    background: '#00897B',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
    flexShrink: 0,
    whiteSpace: 'nowrap' as any,
  },
  updateLabel: {
    lineHeight: 1,
  },

  /* Search bar */
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '0 8px',
    height: 34,
    minWidth: 160,
    maxWidth: 260,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 12,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    padding: '0 4px',
  },

  /* Dropdown menu */
  menuBackdrop: {
    position: 'fixed' as any,
    inset: 0,
    zIndex: 99,
  },
  dropMenu: {
    position: 'absolute' as any,
    top: 38,
    right: 0,
    minWidth: 180,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 10,
    padding: '4px 0',
    boxShadow: '0 8px 32px rgba(0,0,0,.14)',
    zIndex: 100,
  },
  dropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    textAlign: 'left' as any,
    transition: 'all 0.12s cubic-bezier(.4,0,.2,1)',
  },

  contentRow: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  },
}
