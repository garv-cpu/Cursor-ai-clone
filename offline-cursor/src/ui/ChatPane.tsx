import React, { useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant' | 'system'; content: string }

export function ChatPane({ projectContext }: { projectContext: string }) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'system', content: 'You are a helpful coding assistant working fully offline.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function send() {
    if (!input.trim()) return
    const newMsgs = [...messages, { role: 'user', content: input }]
    setMessages(newMsgs)
    setInput('')
    setBusy(true)
    const withContext = [
      ...newMsgs,
      { role: 'system', content: `Project files:\n${projectContext}` }
    ]
    const res = await window.api.llm.chat(withContext)
    setBusy(false)
    if (res?.text) setMessages((m) => [...m, { role: 'assistant', content: res.text }])
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <b>{m.role}:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 8, borderTop: '1px solid #333' }}>
        <input style={{ flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask something..." />
        <button disabled={busy} onClick={send}>{busy ? '...' : 'Send'}</button>
      </div>
    </div>
  )
}

