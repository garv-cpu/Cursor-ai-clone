import React from 'react'

export function Sidebar({ projectFiles, onOpenFile, onOpenSettings }: { projectFiles: string[]; onOpenFile: (p: string) => void; onOpenSettings: () => void }) {
  return (
    <div style={{ width: 280, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #333', display: 'flex', gap: 8 }}>
        <button onClick={onOpenSettings}>Open Project / Settings</button>
      </div>
      <div style={{ overflow: 'auto', flex: 1 }}>
        {projectFiles.map((f) => (
          <div key={f} style={{ padding: '6px 10px', cursor: 'pointer' }} onClick={() => onOpenFile(f)}>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

