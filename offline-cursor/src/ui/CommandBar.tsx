import React, { useState } from 'react'
import { buildRefactorPrompt, RefactorCommand } from '../../shared/commands'

export function CommandBar({ path, code, projectContext, onApply }: { path: string | null; code: string; projectContext: string; onApply: (newCode: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [lastCmd, setLastCmd] = useState<RefactorCommand | null>(null)

  async function run(cmd: RefactorCommand) {
    if (!path) return
    setBusy(true)
    setLastCmd(cmd)
    const prompt = buildRefactorPrompt(cmd, path, code.slice(0, 20000), projectContext)
    const res = await window.api.llm.generate(prompt)
    setBusy(false)
    const text = res?.text || ''
    if (cmd === 'explain') return alert(text)
    // Try to strip markdown fences
    const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '')
    if (cleaned.trim()) onApply(cleaned)
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button disabled={busy || !path} onClick={() => run('refactor')}>Refactor</button>
      <button disabled={busy || !path} onClick={() => run('fix')}>Fix</button>
      <button disabled={busy || !path} onClick={() => run('explain')}>Explain</button>
      {busy && <span>Running {lastCmd}…</span>}
    </div>
  )
}

