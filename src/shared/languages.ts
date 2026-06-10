import type { LanguageMode } from './types';

export const LANGUAGE_MODES: LanguageMode[] = [
  { id: 'plaintext', label: '纯文本', monacoLanguage: 'plaintext', extensions: ['txt', 'log'] },
  { id: 'mysql', label: 'MySQL', monacoLanguage: 'sql', extensions: ['sql', 'mysql'] },
  { id: 'java', label: 'Java', monacoLanguage: 'java', extensions: ['java'] },
  { id: 'php', label: 'PHP', monacoLanguage: 'php', extensions: ['php'] },
  { id: 'json', label: 'JSON', monacoLanguage: 'json', extensions: ['json'] },
  { id: 'javascript', label: 'JavaScript', monacoLanguage: 'javascript', extensions: ['js', 'jsx', 'mjs', 'cjs'] },
  { id: 'typescript', label: 'TypeScript', monacoLanguage: 'typescript', extensions: ['ts', 'tsx'] },
  { id: 'html', label: 'HTML', monacoLanguage: 'html', extensions: ['html', 'htm'] },
  { id: 'css', label: 'CSS', monacoLanguage: 'css', extensions: ['css', 'scss', 'less'] },
  { id: 'markdown', label: 'Markdown', monacoLanguage: 'markdown', extensions: ['md', 'markdown'] },
  { id: 'python', label: 'Python', monacoLanguage: 'python', extensions: ['py'] },
  { id: 'go', label: 'Go', monacoLanguage: 'go', extensions: ['go'] },
  { id: 'rust', label: 'Rust', monacoLanguage: 'rust', extensions: ['rs'] },
  { id: 'cpp', label: 'C/C++', monacoLanguage: 'cpp', extensions: ['c', 'h', 'cpp', 'hpp', 'cc', 'cxx'] },
  { id: 'xml', label: 'XML', monacoLanguage: 'xml', extensions: ['xml'] },
  { id: 'yaml', label: 'YAML', monacoLanguage: 'yaml', extensions: ['yml', 'yaml'] },
  { id: 'shell', label: 'Shell', monacoLanguage: 'shell', extensions: ['sh', 'zsh', 'bash'] }
];

const modeById = new Map(LANGUAGE_MODES.map((mode) => [mode.id, mode]));
const modeByExtension = new Map(LANGUAGE_MODES.flatMap((mode) => mode.extensions.map((extension) => [extension, mode])));

export function detectLanguageMode(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension ? modeByExtension.get(extension)?.id ?? 'plaintext' : 'plaintext';
}

export function getLanguageMode(id: string): LanguageMode {
  return modeById.get(id) ?? modeById.get('plaintext')!;
}

export function getLanguageLabel(id: string): string {
  return getLanguageMode(id).label;
}

export function getMonacoLanguage(id: string): string {
  return getLanguageMode(id).monacoLanguage;
}
