import type { AppFile, DiffSession } from '../../../shared/types';
import { detectLanguageMode } from '../../../shared/languages';

export function detectLanguage(name: string): string {
  return detectLanguageMode(name);
}

export function createUntitledFile(index: number): AppFile {
  const name = `未命名-${index}.txt`;
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

export function updateFileLanguage(files: AppFile[], fileId: string, language: string): AppFile[] {
  return files.map((file) => (file.id === fileId ? { ...file, language } : file));
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
      leftTitle: file?.name ?? '左侧文件'
    };
  }

  return {
    ...session,
    rightFileId: file?.id ?? null,
    rightTitle: file?.name ?? '右侧文件'
  };
}
