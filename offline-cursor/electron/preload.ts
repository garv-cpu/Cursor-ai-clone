import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (partial: any) => ipcRenderer.invoke('settings:set', partial),
    openFolder: () => ipcRenderer.invoke('settings:openFolder')
  },
  models: {
    list: () => ipcRenderer.invoke('models:list'),
    testConnection: () => ipcRenderer.invoke('connection:test')
  },
  llm: {
    generate: (prompt: string) => ipcRenderer.invoke('llm:generate', prompt),
    chat: (messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>) => ipcRenderer.invoke('llm:chat', messages)
  },
  project: {
    scan: () => ipcRenderer.invoke('project:scan')
  },
  fs: {
    readFile: (absPath: string) => ipcRenderer.invoke('fs:readFile', absPath),
    writeFile: (absPath: string, content: string) => ipcRenderer.invoke('fs:writeFile', absPath, content)
  },
  shell: {
    reveal: (absPath: string) => ipcRenderer.invoke('shell:reveal', absPath)
  }
})

declare global {
  interface Window {
    api: any
  }
}

