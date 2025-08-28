import React, { useCallback, useEffect, useRef } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'

interface Props {
  path: string | null
  value: string
  onChange: (text: string) => void
  projectContext: string
}

export function EditorPane({ path, value, onChange, projectContext }: Props) {
  const monaco = useMonaco()
  const modelRef = useRef<import('monaco-editor').editor.ITextModel | null>(null)

  const registerInlineCompletion = useCallback(() => {
    if (!monaco) return
    monaco.languages.registerInlineCompletionsProvider({
      pattern: '**',
      provideInlineCompletions: async (model, position, context, token) => {
        try {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          })
          const prefix = textUntilPosition.slice(-8000)
          const prompt = `You are a coding assistant. File: ${path}\n\nProject context (filenames):\n${projectContext}\n\nComplete the next few tokens.\n\nCode:\n${prefix}`
          const res = await window.api.llm.generate(prompt)
          const text = res?.text || ''
          return {
            items: [
              {
                insertText: text,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column
                }
              }
            ]
          }
        } catch (e) {
          return { items: [] }
        }
      },
      freeInlineCompletions: () => {}
    })
  }, [monaco, path, projectContext])

  useEffect(() => {
    registerInlineCompletion()
  }, [registerInlineCompletion])

  return (
    <Editor
      height="100%"
      defaultLanguage="typescript"
      path={path || undefined}
      value={value}
      onChange={(v) => onChange(v || '')}
      options={{ fontSize: 14, minimap: { enabled: false }, inlineSuggest: { enabled: true } }}
      onMount={(editor, monacoInstance) => {
        modelRef.current = editor.getModel()
      }}
    />
  )
}

