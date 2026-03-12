/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ElectronAPI {
  platform: 'darwin' | 'win32' | 'linux'
  showNotification: (data: { title: string; body: string; tag?: string }) => void
  setBadgeCount: (count: number) => void
}

interface ElectronUpdater {
  onUpdateAvailable: (cb: (info: { version: string }) => void) => void
  onDownloadProgress: (cb: (progress: { percent: number }) => void) => void
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => void
  downloadUpdate: () => void
  installUpdate: () => void
  getAppVersion: () => Promise<string>
}

interface Window {
  electronAPI?: ElectronAPI
  electronUpdater?: ElectronUpdater
}
