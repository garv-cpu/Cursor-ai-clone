import path from 'node:path'
import fs from 'node:fs/promises'
import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron'
import { createSettingsStore, SettingsStore } from './store'

let mainWindow: BrowserWindow | null = null
let settings: SettingsStore

function getPreloadPath() {
  return path.join(__dirname, 'preload.js')
}

function getRendererIndexHtml() {
  return path.join(__dirname, 'renderer', 'index.html')
}

async function createWindow() {
  settings = createSettingsStore()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    },
    title: 'Offline Cursor'
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(getRendererIndexHtml())
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) await createWindow()
})

app.whenReady().then(async () => {
  // Offline-only guardrails: block all external requests except configured baseUrl and dev server
  const base = new URL(createSettingsStore().get().baseUrl)
  const allowedHosts = new Set<string>([base.host])
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    try {
      const u = new URL(devUrl)
      allowedHosts.add(u.host)
    } catch {}
  }
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    try {
      if (details.url.startsWith('file:')) return callback({ cancel: false })
      const u = new URL(details.url)
      if (allowedHosts.has(u.host)) return callback({ cancel: false })
      return callback({ cancel: true })
    } catch {
      return callback({ cancel: true })
    }
  })
  await createWindow()
})

// Simple HTTP helper using fetch available in Node 18+
async function httpJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`)
  }
  return response.json()
}

// IPC: Settings
ipcMain.handle('settings:get', async () => {
  return settings.get()
})

ipcMain.handle('settings:set', async (_evt, newSettings: Partial<SettingsStore['data']>) => {
  settings.set(newSettings)
  return settings.get()
})

ipcMain.handle('settings:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) return null
  const folder = result.filePaths[0]
  settings.set({ projectRoot: folder })
  return folder
})

// IPC: Models
ipcMain.handle('models:list', async () => {
  const { provider, baseUrl } = settings.get()
  try {
    if (provider === 'ollama') {
      const data = await httpJson(`${baseUrl}/api/tags`)
      const models = (data.models || []).map((m: any) => m.name)
      return models
    }
    if (provider === 'lmstudio') {
      const data = await httpJson(`${baseUrl}/v1/models`)
      const models = (data.data || []).map((m: any) => m.id)
      return models
    }
    return []
  } catch (e: any) {
    return { error: e.message || String(e) }
  }
})

ipcMain.handle('connection:test', async () => {
  try {
    const res = await httpJson(`${settings.get().baseUrl.replace(/\/$/, '')}/`) // may 404; acceptable
    return { ok: true, data: res }
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) }
  }
})

// IPC: LLM generate/chat (non-streaming for MVP)
ipcMain.handle('llm:generate', async (_evt, prompt: string) => {
  const { provider, baseUrl, model, temperature, topP } = settings.get()
  try {
    if (provider === 'ollama') {
      const res = await httpJson(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false, options: { temperature, top_p: topP } })
      })
      return { text: res.response || '' }
    }
    if (provider === 'lmstudio') {
      const res = await httpJson(`${baseUrl}/v1/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, temperature, top_p: topP, stream: false })
      })
      return { text: res.choices?.[0]?.text || '' }
    }
    return { text: '' }
  } catch (e: any) {
    return { error: e.message || String(e) }
  }
})

ipcMain.handle('llm:chat', async (_evt, messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>) => {
  const { provider, baseUrl, model, temperature, topP } = settings.get()
  try {
    if (provider === 'ollama') {
      const res = await httpJson(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, options: { temperature, top_p: topP } })
      })
      const text = res.message?.content || ''
      return { text }
    }
    if (provider === 'lmstudio') {
      const res = await httpJson(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature, top_p: topP, stream: false })
      })
      const text = res.choices?.[0]?.message?.content || ''
      return { text }
    }
    return { text: '' }
  } catch (e: any) {
    return { error: e.message || String(e) }
  }
})

// IPC: Project indexer and file operations
ipcMain.handle('project:scan', async () => {
  const root = settings.get().projectRoot
  if (!root) return { error: 'No project root set' }
  async function walk(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name)
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', '.next', 'dist', 'build'].includes(entry.name)) return []
        return walk(res)
      } else {
        return [res]
      }
    }))
    return files.flat()
  }
  const files = await walk(root)
  return { root, files }
})

ipcMain.handle('fs:readFile', async (_evt, absPath: string) => {
  const content = await fs.readFile(absPath, 'utf8')
  return { content }
})

ipcMain.handle('fs:writeFile', async (_evt, absPath: string, content: string) => {
  await fs.writeFile(absPath, content, 'utf8')
  return { ok: true }
})

ipcMain.handle('shell:reveal', async (_evt, absPath: string) => {
  shell.showItemInFolder(absPath)
  return { ok: true }
})

