import React, { useEffect, useMemo, useState } from 'react'
import { EditorPane } from './EditorPane'
import { Sidebar } from './Sidebar'
import { ChatPane } from './ChatPane'
import { SettingsPane } from './SettingsPane'
import { CommandBar } from './CommandBar'

type FileNode = { path: string }

export function App() {
  const [projectFiles, setProjectFiles] = useState<string[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [activeContent, setActiveContent] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // Initial scan if project root configured
    ;(async () => {
      const scan = await window.api.project.scan()
      if (!scan?.error) {
        setProjectFiles(scan.files)
      }
    })()
  }, [])

  async function openFile(p: string) {
    const res = await window.api.fs.readFile(p)
    setActivePath(p)
    setActiveContent(res.content)
  }

  async function saveFile() {
    if (!activePath) return
    await window.api.fs.writeFile(activePath, activeContent)
  }

  const contextSnippet = useMemo(() => {
    // Very light project context example: first KB of file list
    return projectFiles.slice(0, 200).join('\n')
  }, [projectFiles])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar
        projectFiles={projectFiles}
        onOpenFile={openFile}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 8, borderBottom: '1px solid #333', display: 'flex', gap: 8 }}>
          <button onClick={saveFile}>Save</button>
          <button onClick={() => setShowSettings(true)}>Settings</button>
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ flex: 2, borderRight: '1px solid #333' }}>
            <div style={{ padding: 8, borderBottom: '1px solid #333' }}>
              <CommandBar path={activePath} code={activeContent} projectContext={contextSnippet} onApply={setActiveContent} />
            </div>
            <EditorPane
              path={activePath}
              value={activeContent}
              onChange={setActiveContent}
              projectContext={contextSnippet}
            />
          </div>
          <div style={{ flex: 1 }}>
            <ChatPane projectContext={contextSnippet} />
          </div>
        </div>
      </div>
      {showSettings && <SettingsPane onClose={() => setShowSettings(false)} />}
    </div>
  )
}

