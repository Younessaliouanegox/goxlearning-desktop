import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform, // 'darwin' | 'win32' | 'linux'
  showNotification: (data: { title: string; body: string; tag?: string }) => {
    ipcRenderer.send('show-notification', data)
  },
  setBadgeCount: (count: number) => {
    ipcRenderer.send('set-badge-count', count)
  },
})

contextBridge.exposeInMainWorld('electronUpdater', {
  onUpdateAvailable: (cb: (info: { version: string }) => void) => {
    ipcRenderer.on('update-available', (_e, info) => cb(info))
  },
  onDownloadProgress: (cb: (progress: { percent: number }) => void) => {
    ipcRenderer.on('download-progress', (_e, progress) => cb(progress))
  },
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    ipcRenderer.on('update-downloaded', (_e, info) => cb(info))
  },
  downloadUpdate: () => {
    ipcRenderer.send('download-update')
  },
  installUpdate: () => {
    ipcRenderer.send('install-update')
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
})
