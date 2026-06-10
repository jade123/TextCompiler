import type { AppFile, DiffSession } from '@shared/types';

const languageByExtension: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  xml: 'xml',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shell',
  zsh: 'shell',
  txt: 'plaintext'
};

export function detectLanguage(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension ? languageByExtension[extension] ?? 'plaintext' : 'plaintext';
}

export function createUntitledFile(index: number): AppFile {
  const name = `untitled-${index}.txt`;
  return {
    id: `untitled:${index}:${Date.now()}`,
    name,
    path: null,
    content: '',
    language: 'plaintext',
    dirty: true,
    lastSavedContent: ''
  };
}

export function updateFileContent(files: AppFile[], fileId: string, content: string): AppFile[] {
  return files.map((file) =>
    file.id === fileId
      ? {
          ...file,
          content,
          dirty: content !== file.lastSavedContent
        }
      : file
  );
}

export function markFileSaved(files: AppFile[], fileId: string, content: string): AppFile[] {
  return files.map((file) =>
    file.id === fileId
      ? {
          ...file,
          content,
          dirty: false,
          lastSavedContent: content
        }
      : file
  );
}

export function swapDiffSides(session: DiffSession): DiffSession {
  return {
    leftFileId: session.rightFileId,
    rightFileId: session.leftFileId,
    leftTitle: session.rightTitle,
    rightTitle: session.leftTitle
  };
}

export function renameDiffSide(session: DiffSession, side: 'left' | 'right', file: AppFile | null): DiffSession {
  if (side === 'left') {
    return {
      ...session,
      leftFileId: file?.id ?? null,
      leftTitle: file?.name ?? 'Left file'
    };
  }

  return {
    ...session,
    rightFileId: file?.id ?? null,
    rightTitle: file?.name ?? 'Right file'
  };
}
