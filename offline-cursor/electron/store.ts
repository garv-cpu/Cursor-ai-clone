import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export type Provider = 'ollama' | 'lmstudio'

export interface AppSettingsData {
  provider: Provider
  baseUrl: string
  model: string
  temperature: number
  topP: number
  projectRoot: string | null
}

export interface SettingsStore {
  data: AppSettingsData
  get(): AppSettingsData
  set(partial: Partial<AppSettingsData>): void
}

const defaultSettings: AppSettingsData = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama3',
  temperature: 0.2,
  topP: 0.95,
  projectRoot: null
}

function getConfigPath() {
  const dir = path.join(os.homedir(), '.offline-cursor')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'settings.json')
}

export function createSettingsStore(): SettingsStore {
  const configPath = getConfigPath()
  let data: AppSettingsData = defaultSettings
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      data = { ...defaultSettings, ...JSON.parse(content) }
    }
  } catch {
    data = defaultSettings
  }

  function persist() {
    try {
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8')
    } catch {}
  }

  return {
    get() {
      return data
    },
    set(partial) {
      data = { ...data, ...partial }
      persist()
    },
    data
  }
}

