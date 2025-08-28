import React, { useEffect, useState } from 'react'

type Provider = 'ollama' | 'lmstudio'

export function SettingsPane({ onClose }: { onClose: () => void }) {
  const [provider, setProvider] = useState<Provider>('ollama')
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434')
  const [model, setModel] = useState('llama3')
  const [temperature, setTemperature] = useState(0.2)
  const [topP, setTopP] = useState(0.95)
  const [models, setModels] = useState<string[]>([])
  const [projectRoot, setProjectRoot] = useState<string | null>(null)
  const [conn, setConn] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      const s = await window.api.settings.get()
      setProvider(s.provider)
      setBaseUrl(s.baseUrl)
      setModel(s.model)
      setTemperature(s.temperature)
      setTopP(s.topP)
      setProjectRoot(s.projectRoot)
    })()
  }, [])

  async function refreshModels() {
    const res = await window.api.models.list()
    if (Array.isArray(res)) setModels(res)
  }

  async function save() {
    await window.api.settings.set({ provider, baseUrl, model, temperature, topP })
    onClose()
  }

  async function chooseFolder() {
    const dir = await window.api.settings.openFolder()
    if (dir) setProjectRoot(dir)
  }

  async function testConnection() {
    const res = await window.api.models.testConnection()
    setConn(res.ok ? 'OK' : `Error: ${res.error}`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }}>
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', background: '#1e1e1e', padding: 16, width: 600, border: '1px solid #333' }}>
        <h3>Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8, alignItems: 'center' }}>
          <label>Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
            <option value="ollama">Ollama</option>
            <option value="lmstudio">LM Studio</option>
          </select>

          <label>Base URL</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />

          <label>Model</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={model} onChange={(e) => setModel(e.target.value)} />
            <button onClick={refreshModels}>Refresh</button>
          </div>
          <div></div>
          <div style={{ gridColumn: '1 / span 2' }}>
            {models.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {models.map((m) => (
                  <button key={m} onClick={() => setModel(m)}>{m}</button>
                ))}
              </div>
            )}
          </div>

          <label>Temperature</label>
          <input type="number" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
          <label>Top P</label>
          <input type="number" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} />

          <label>Project Root</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ flex: 1 }} value={projectRoot || ''} readOnly />
            <button onClick={chooseFolder}>Choose…</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <button onClick={testConnection}>Test connection</button>
            <span style={{ marginLeft: 8 }}>{conn}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}>Cancel</button>
            <button onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

