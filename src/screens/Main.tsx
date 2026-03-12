import React, { useState, useMemo } from 'react'
import {
  MessageSquare, Megaphone, Palette, FolderOpen, Headphones,
  Search, MoreVertical, X, Users, Bell, ClipboardList,
} from 'lucide-react'
import { useGroups } from '../lib/hooks/useGroups'
import { useNotifications } from '../lib/hooks/useNotifications'
import Sidebar from '../layouts/Sidebar'
import GeneralTab from './GeneralTab'
import AnnoncesTab from './AnnoncesTab'
import CreativityTab from './CreativityTab'
import ResourcesTab from './ResourcesTab'
import SupportTab from './SupportTab'
import TodoTab from './TodoTab'
import ProfileScreen from './ProfileScreen'
import GroupInfoPanel from '../components/GroupInfoPanel'
import NotificationPanel from '../components/NotificationPanel'
import type { Student, Tab } from '../types'
import { isStaff as checkStaff } from '../lib/roles'

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

  const groupIds = useMemo(() => groups.map(g => g.id), [groups])
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(student.id, student.name, groupIds)

  const isStaff = checkStaff(student.role)
  const meta = TAB_META[activeTab]
  const groupIdx = groups.findIndex(g => g.id === selectedGroup?.id)

  if (showProfile) {
    return (
      <div style={styles.layout}>
        <Sidebar
          student={student}
          groups={groups}
          selectedGroupId={selectedGroup?.id}
          activeTab={activeTab}
          onSelectGroup={setSelectedGroup}
          onTabChange={(tab) => { setShowProfile(false); setActiveTab(tab) }}
          onSignOut={onSignOut}
          onProfileClick={() => setShowProfile(true)}
        />
        <ProfileScreen
          student={student}
          onBack={() => setShowProfile(false)}
          onUpdateAvatar={(url) => setStudent({ ...student, avatar_url: url })}
        />
      </div>
    )
  }

  return (
    <div style={styles.layout}>
      <Sidebar
        student={student}
        groups={groups}
        selectedGroupId={selectedGroup?.id}
        activeTab={activeTab}
        onSelectGroup={setSelectedGroup}
        onTabChange={setActiveTab}
        onSignOut={onSignOut}
        onProfileClick={() => setShowProfile(true)}
      />

      <div style={styles.main}>
        {/* ── Telegram-style header ── */}
        <div style={styles.header} className="titlebar-drag">
          <div style={styles.headerLeft} className="titlebar-nodrag">
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
                <button style={styles.iconBtn} onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button style={styles.iconBtn} onClick={() => setSearchOpen(true)} title="Rechercher">
                <Search size={16} />
              </button>
            )}

            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button style={styles.iconBtn} onClick={() => setShowNotifs(!showNotifs)} title="Notifications">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <div style={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</div>
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
                <button style={styles.iconBtn} onClick={() => setShowMenu(!showMenu)} title="Menu">
                  <MoreVertical size={16} />
                </button>
                {showMenu && (
                  <>
                    <div style={styles.menuBackdrop} onClick={() => setShowMenu(false)} />
                    <div style={styles.dropMenu}>
                      <button style={styles.dropItem} onClick={() => { setShowGroupInfo(!showGroupInfo); setShowMenu(false) }}>
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
            {activeTab === 'annonces' && <AnnoncesTab group={selectedGroup} student={student} />}
            {activeTab === 'creativity' && <CreativityTab group={selectedGroup} student={student} />}
            {activeTab === 'resources' && <ResourcesTab group={selectedGroup} student={student} />}
            {activeTab === 'todos' && <TodoTab group={selectedGroup} student={student} />}
            {activeTab === 'support' && <SupportTab student={student} />}
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
    transition: 'all 0.12s ease',
    flexShrink: 0,
    position: 'relative' as any,
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
