import { invoke } from '@tauri-apps/api/core';
import type { AppFile } from '../../shared/types';

export const desktop = {
  openFiles: (): Promise<AppFile[]> => invoke('open_files'),
  readDroppedFiles: (filePaths: string[]): Promise<AppFile[]> => invoke('read_dropped_files', { filePaths }),
  saveFile: (filePath: string, content: string): Promise<void> => invoke('save_file', { filePath, content }),
  saveFileAs: (defaultName: string, content: string): Promise<AppFile | null> =>
    invoke('save_file_as', { defaultName, content }),
  showInFolder: (filePath: string): Promise<void> => invoke('show_in_folder', { filePath })
};

export type DesktopApi = typeof desktop;
