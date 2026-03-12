import React from 'react'
import { MessageSquare, Megaphone, Palette, FolderOpen, Headphones } from 'lucide-react'
import { colors } from '../lib/theme'
import type { Tab } from '../types'

const TABS: { key: Tab; label: string; Icon: React.ComponentType<any> }[] = [
  { key: 'general', label: 'Discussion', Icon: MessageSquare },
  { key: 'annonces', label: 'Annonces', Icon: Megaphone },
  { key: 'creativity', label: 'Créativité', Icon: Palette },
  { key: 'resources', label: 'Ressources', Icon: FolderOpen },
  { key: 'support', label: 'Support', Icon: Headphones },
]

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div style={styles.bar}>
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          style={{ ...styles.tab, ...(activeTab === key ? styles.tabActive : {}) }}
          onClick={() => onTabChange(key)}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 4, padding: '8px 16px',
    background: colors.white,
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 6, padding: '10px 0',
    borderRadius: 12, border: 'none', cursor: 'pointer',
    background: 'transparent', color: colors.textTertiary,
    fontSize: 12, fontWeight: 600, transition: 'all .15s',
  },
  tabActive: {
    background: colors.brand, color: colors.white,
  },
}
