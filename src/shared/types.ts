export type AppFile = {
  id: string;
  name: string;
  path: string | null;
  content: string;
  language: string;
  dirty: boolean;
  lastSavedContent: string;
};

export type DiffSession = {
  leftFileId: string | null;
  rightFileId: string | null;
  leftTitle: string;
  rightTitle: string;
};

export type SaveFileAsRequest = {
  defaultName: string;
  content: string;
};

export type LanguageMode = {
  id: string;
  label: string;
  monacoLanguage: string;
  extensions: string[];
};
