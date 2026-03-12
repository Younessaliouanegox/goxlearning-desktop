import { contextBridge, ipcRenderer } from 'electron'

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
  installUpdate: () => {
    ipcRenderer.send('install-update')
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
})
