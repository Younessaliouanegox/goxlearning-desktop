import { app, BrowserWindow, ipcMain, screen, Notification, nativeImage } from 'electron'
import path from 'path'
import { autoUpdater } from 'electron-updater'
import AutoLaunch from 'auto-launch'

let mainWindow: BrowserWindow | null = null

/* ── Auto-updater config ── */
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupAutoUpdater() {
  if (process.env.VITE_DEV_SERVER_URL) return // skip in dev

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', { version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('download-progress', { percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message)
  })

  // Check for updates 3 seconds after launch, then every 30 minutes
  setTimeout(() => autoUpdater.checkForUpdates(), 3000)
  setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000)
}

/* ── IPC handlers ── */
ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.on('install-update', () => {
  setImmediate(() => {
    app.removeAllListeners('window-all-closed')
    mainWindow?.close()
    autoUpdater.quitAndInstall(false, true)
  })
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

/* ── Native OS notifications ── */
ipcMain.on('show-notification', (_e, data: { title: string; body: string; tag?: string }) => {
  if (!Notification.isSupported()) return

  const iconPath = path.join(__dirname, '../build/icon-large.png')
  const icon = nativeImage.createFromPath(iconPath)

  const notif = new Notification({
    title: data.title,
    body: data.body,
    silent: false,
    icon: icon.isEmpty() ? undefined : icon,
  })

  notif.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
    }
  })

  notif.show()
})

ipcMain.on('set-badge-count', (_e, count: number) => {
  if (process.platform === 'darwin') {
    app.dock.setBadge(count > 0 ? String(count) : '')
  }
})

/* ── Window creation ── */
function createWindow() {
  const isMac = process.platform === 'darwin'

  const appIcon = nativeImage.createFromPath(path.join(__dirname, '../build/icon-large.png'))

  if (isMac && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon)
  }

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 420,
    minHeight: 600,
    icon: appIcon.isEmpty() ? undefined : appIcon,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: !isMac ? {
      color: '#ffffff',
      symbolColor: '#1a237e',
      height: 40,
    } : undefined,
    trafficLightPosition: isMac ? { x: 16, y: 14 } : undefined,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()

  // Auto-launch on system startup
  if (!process.env.VITE_DEV_SERVER_URL) {
    const autoLauncher = new AutoLaunch({
      name: 'GoxLearning',
      isHidden: false,
    })
    autoLauncher.isEnabled().then((isEnabled: boolean) => {
      if (!isEnabled) autoLauncher.enable()
    }).catch((err: any) => console.error('[AutoLaunch] Error:', err))
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
