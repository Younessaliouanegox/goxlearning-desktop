import React, { useState } from 'react'
import { MessageSquare, Megaphone, Palette, FolderOpen, Headphones, LogOut, Users, ChevronRight, Copy, Info, Mail, ClipboardList } from 'lucide-react'
import ContextMenu, { type ContextMenuItem } from '../components/ContextMenu'
import type { Student, Group, Tab } from '../types'

interface SidebarProps {
  student: Student
  groups: Group[]
  selectedGroupId: string | undefined
  activeTab: Tab
  onSelectGroup: (group: Group) => void
  onTabChange: (tab: Tab) => void
  onSignOut: () => void
  onProfileClick?: () => void
}

const NAV_ITEMS: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'general', label: 'Discussion', icon: MessageSquare },
  { key: 'annonces', label: 'Annonces', icon: Megaphone },
  { key: 'creativity', label: 'Créativité', icon: Palette },
  { key: 'resources', label: 'Ressources', icon: FolderOpen },
  { key: 'todos', label: 'Tâches', icon: ClipboardList },
  { key: 'support', label: 'Support', icon: Headphones },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getGroupInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

const GROUP_COLORS = [
  '#1a237e', '#0d47a1', '#00695c', '#2e7d32', '#e65100',
  '#6a1b9a', '#c62828', '#283593', '#00838f', '#4e342e',
]

function getGroupColor(index: number) {
  return GROUP_COLORS[index % GROUP_COLORS.length]
}

export default function Sidebar({
  student, groups, selectedGroupId, activeTab,
  onSelectGroup, onTabChange, onSignOut, onProfileClick,
}: SidebarProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const handleGroupCtx = (e: React.MouseEvent, g: Group) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Copier le nom', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(g.name) },
        ...(g.courses?.name ? [{ label: 'Copier le cours', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(g.courses!.name) }] : []),
        ...(g.drive_link ? [{ label: 'Ouvrir OneDrive', icon: <Info size={14} />, divider: true, onClick: () => window.open(g.drive_link!, '_blank') }] : []),
        ...(g.meet_link ? [{ label: 'Ouvrir Google Meet', icon: <Info size={14} />, onClick: () => window.open(g.meet_link!, '_blank') }] : []),
      ],
    })
  }

  const handleProfileCtx = (e: React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Copier l\'email', icon: <Mail size={14} />, onClick: () => navigator.clipboard.writeText(student.email) },
        { label: 'Copier le nom', icon: <Copy size={14} />, onClick: () => navigator.clipboard.writeText(student.name) },
        { label: 'Déconnexion', icon: <LogOut size={14} />, danger: true, divider: true, onClick: onSignOut },
      ],
    })
  }

  return (
    <div style={styles.sidebar} className="titlebar-drag">
      {/* Logo */}
      <div style={styles.logoSection} className="titlebar-drag">
        <img
          src="/logo-light.png"
          alt="GoxLearning"
          style={styles.logo}
          className="titlebar-nodrag"
        />
      </div>

      {/* Navigation */}
      <div style={styles.navSection} className="titlebar-nodrag">
        <div style={styles.sectionLabel} className="sidebar-section-label">NAVIGATION</div>
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
              onClick={() => onTabChange(key)}
            >
              <div style={{
                ...styles.navIcon,
                ...(isActive ? styles.navIconActive : {}),
              }}>
                <Icon size={16} />
              </div>
              <span style={{
                ...styles.navLabel,
                ...(isActive ? styles.navLabelActive : {}),
              }} className="sidebar-label">
                {label}
              </span>
              {isActive && <div style={styles.activeIndicator} />}
            </button>
          )
        })}
      </div>

      {/* Groups */}
      <div style={styles.groupsSection} className="titlebar-nodrag">
        <div style={styles.sectionHeader}>
          <div style={styles.sectionLabel} className="sidebar-section-label">GROUPES</div>
          <div style={styles.groupCount} className="sidebar-group-count">{groups.length}</div>
        </div>
        <div style={styles.groupList}>
          {groups.map((g, i) => {
            const isSelected = g.id === selectedGroupId
            return (
              <button
                key={g.id}
                style={{
                  ...styles.groupItem,
                  ...(isSelected ? styles.groupItemActive : {}),
                }}
                onClick={() => onSelectGroup(g)}
                onContextMenu={(e) => handleGroupCtx(e, g)}
              >
                <div style={{
                  ...styles.groupAvatar,
                  background: g.image_url ? 'transparent' : (isSelected ? 'var(--brand)' : getGroupColor(i)),
                }}>
                  {g.image_url
                    ? <img src={g.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                    : getGroupInitial(g.name)
                  }
                </div>
                <div style={styles.groupInfo} className="sidebar-group-info">
                  <div style={{
                    ...styles.groupName,
                    color: isSelected ? 'var(--brand)' : 'var(--text-primary)',
                  }}>
                    {g.name}
                  </div>
                  {g.courses?.name && (
                    <div style={styles.groupCourse}>{g.courses.name}</div>
                  )}
                </div>
                {isSelected && <ChevronRight size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
              </button>
            )
          })}
          {groups.length === 0 && (
            <div style={styles.emptyGroups}>
              <Users size={20} style={{ color: 'var(--text-tertiary)', marginBottom: 6 }} />
              <span>Aucun groupe</span>
            </div>
          )}
        </div>
      </div>

      {/* User profile + logout */}
      <div style={styles.profileSection} className="titlebar-nodrag">
        <div
          style={{ ...styles.profileCard, cursor: onProfileClick ? 'pointer' : 'default' }}
          onClick={onProfileClick}
          onContextMenu={handleProfileCtx}
        >
          {student.avatar_url ? (
            <img src={student.avatar_url} alt="" style={styles.profileAvatarImg} />
          ) : (
            <div style={styles.profileAvatar}>
              {getInitials(student.name)}
            </div>
          )}
          <div style={styles.profileInfo} className="sidebar-profile-info">
            <div style={styles.profileName}>{student.name}</div>
            <div style={styles.profileEmail}>{student.email}</div>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={onSignOut}>
          <LogOut size={15} />
        </button>
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minWidth: 'var(--sidebar-width)',
    height: '100vh',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 10,
  },

  // Logo
  logoSection: {
    padding: '20px 20px 12px',
    borderBottom: '1px solid var(--border-light)',
  },
  logo: {
    height: 28,
    objectFit: 'contain' as any,
  },

  // Navigation
  navSection: {
    padding: '16px 12px 8px',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.08em',
    padding: '0 8px',
    marginBottom: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    marginBottom: 8,
  },
  groupCount: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--brand)',
    background: 'var(--brand-light)',
    padding: '2px 8px',
    borderRadius: 99,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'all 0.15s ease',
    position: 'relative' as any,
    marginBottom: 2,
    textAlign: 'left' as any,
  },
  navItemActive: {
    background: 'var(--brand-light)',
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--bg-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  navIconActive: {
    background: 'var(--brand)',
    color: 'var(--text-on-brand)',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    transition: 'color 0.15s ease',
  },
  navLabelActive: {
    color: 'var(--brand)',
    fontWeight: 700,
  },
  activeIndicator: {
    position: 'absolute' as any,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    borderRadius: 3,
    background: 'var(--brand)',
  },

  // Groups
  groupsSection: {
    flex: 1,
    padding: '12px 12px 0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  groupList: {
    flex: 1,
    overflowY: 'auto' as any,
    paddingRight: 4,
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'all 0.15s ease',
    marginBottom: 2,
    textAlign: 'left' as any,
  },
  groupItemActive: {
    background: 'var(--brand-light)',
  },
  groupAvatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    overflow: 'hidden',
  },
  groupInfo: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupCourse: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    marginTop: 1,
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  emptyGroups: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 0',
    fontSize: 12,
    color: 'var(--text-tertiary)',
  },

  // Profile
  profileSection: {
    padding: '12px',
    borderTop: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  profileCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 10,
    minWidth: 0,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: 'var(--brand)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  profileAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    objectFit: 'cover' as any,
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profileEmail: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: 'var(--error-bg)',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--error)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
}
