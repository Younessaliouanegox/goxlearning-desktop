import React, { useEffect, useState } from 'react'
import { Download, RefreshCw, X, CheckCircle2 } from 'lucide-react'

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready'

interface UpdateInfo {
  version: string
}

declare global {
  interface Window {
    electronUpdater?: {
      onUpdateAvailable: (cb: (info: UpdateInfo) => void) => void
      onDownloadProgress: (cb: (progress: { percent: number }) => void) => void
      onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => void
      installUpdate: () => void
      getAppVersion: () => Promise<string>
    }
  }
}

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const updater = window.electronUpdater
    if (!updater) return

    updater.onUpdateAvailable((info) => {
      setVersion(info.version)
      setState('available')
    })

    updater.onDownloadProgress((p) => {
      setState('downloading')
      setProgress(p.percent)
    })

    updater.onUpdateDownloaded((info) => {
      setVersion(info.version)
      setState('ready')
    })
  }, [])

  if (state === 'idle' || dismissed) return null

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        {state === 'available' && (
          <>
            <Download size={14} style={{ flexShrink: 0 }} />
            <span>Mise à jour <strong>v{version}</strong> en cours de téléchargement...</span>
          </>
        )}
        {state === 'downloading' && (
          <>
            <RefreshCw size={14} className="animate-spin" style={{ flexShrink: 0 }} />
            <span>Téléchargement... {progress}%</span>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
          </>
        )}
        {state === 'ready' && (
          <>
            <CheckCircle2 size={14} style={{ flexShrink: 0, color: '#22c55e' }} />
            <span>Version <strong>v{version}</strong> prête !</span>
            <button style={styles.installBtn} onClick={() => window.electronUpdater?.installUpdate()}>
              Redémarrer et installer
            </button>
          </>
        )}
      </div>
      {state !== 'downloading' && (
        <button style={styles.closeBtn} onClick={() => setDismissed(true)}>
          <X size={12} />
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    maxWidth: 360,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    zIndex: 9999,
    animation: 'ctxIn 0.2s ease',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
    minWidth: 0,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    background: 'var(--border-light)',
    overflow: 'hidden',
    minWidth: 60,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    background: 'var(--brand)',
    transition: 'width 0.3s ease',
  },
  installBtn: {
    padding: '5px 12px',
    borderRadius: 7,
    border: 'none',
    background: 'var(--brand)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as any,
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 4,
    borderRadius: 6,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
}
