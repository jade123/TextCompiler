import { describe, expect, it } from 'vitest';
import type { AppFile, DiffSession } from '@shared/types';
import { detectLanguage, markFileSaved, swapDiffSides, updateFileContent } from './fileModel';

function fixtureFile(overrides: Partial<AppFile> = {}): AppFile {
  return {
    id: 'a',
    name: 'demo.ts',
    path: '/tmp/demo.ts',
    content: 'const a = 1;',
    language: 'typescript',
    dirty: false,
    lastSavedContent: 'const a = 1;',
    ...overrides
  };
}

describe('file model', () => {
  it('detects common languages by extension', () => {
    expect(detectLanguage('app.tsx')).toBe('typescript');
    expect(detectLanguage('package.json')).toBe('json');
    expect(detectLanguage('README.md')).toBe('markdown');
    expect(detectLanguage('unknown.asset')).toBe('plaintext');
  });

  it('marks a file dirty when content changes', () => {
    const [file] = updateFileContent([fixtureFile()], 'a', 'const a = 2;');
    expect(file.dirty).toBe(true);
    expect(file.content).toBe('const a = 2;');
  });

  it('clears dirty state when a file is saved', () => {
    const [file] = markFileSaved([fixtureFile({ dirty: true, content: 'draft' })], 'a', 'draft');
    expect(file.dirty).toBe(false);
    expect(file.lastSavedContent).toBe('draft');
  });

  it('swaps diff sides', () => {
    const session: DiffSession = {
      leftFileId: 'left',
      rightFileId: 'right',
      leftTitle: 'old.ts',
      rightTitle: 'new.ts'
    };

    expect(swapDiffSides(session)).toEqual({
      leftFileId: 'right',
      rightFileId: 'left',
      leftTitle: 'new.ts',
      rightTitle: 'old.ts'
    });
  });
});
