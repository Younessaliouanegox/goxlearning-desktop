import { useState, useEffect } from 'react'

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'ready'

interface UpdateState {
  status: UpdateStatus
  version: string | null
  progress: number
  download: () => void
  install: () => void
}

export function useUpdateChecker(): UpdateState {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updater = window.electronUpdater
    if (!updater) return

    updater.onUpdateAvailable((info) => {
      setVersion(info.version)
      setStatus('available')
    })

    updater.onDownloadProgress((p) => {
      setStatus('downloading')
      setProgress(p.percent)
    })

    updater.onUpdateDownloaded((info) => {
      setVersion(info.version)
      setStatus('ready')
      setProgress(100)
    })
  }, [])

  const download = () => {
    if (status !== 'available') return
    setStatus('downloading')
    setProgress(0)
    window.electronUpdater?.downloadUpdate()
  }

  const install = () => {
    window.electronUpdater?.installUpdate()
  }

  return { status, version, progress, download, install }
}
