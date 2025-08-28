export type RefactorCommand = 'refactor' | 'fix' | 'explain'

export function buildRefactorPrompt(command: RefactorCommand, filePath: string, code: string, projectContext: string): string {
  const instruction =
    command === 'refactor'
      ? 'Refactor the following code for readability and performance without changing behavior.'
      : command === 'fix'
      ? 'Find and fix bugs in the following code. Provide the corrected code only.'
      : 'Explain what this code does and suggest improvements.'
  return `You are an offline coding assistant. Project files (names):\n${projectContext}\n\nFile: ${filePath}\nTask: ${instruction}\n\nCode:\n${code}`
}

