import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { AppFile } from '../shared/types';

const desktop = {
  openFiles: (): Promise<AppFile[]> => ipcRenderer.invoke('files:open'),
  readDroppedFiles: (files: File[]): Promise<AppFile[]> => {
    const paths = files
      .map((file) => webUtils.getPathForFile(file))
      .filter((filePath): filePath is string => filePath.length > 0);

    return ipcRenderer.invoke('files:read-dropped', paths);
  },
  saveFile: (filePath: string, content: string): Promise<void> => ipcRenderer.invoke('files:save', filePath, content),
  saveFileAs: (defaultName: string, content: string): Promise<AppFile | null> =>
    ipcRenderer.invoke('files:save-as', { defaultName, content }),
  showInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke('files:show-in-folder', filePath)
};

contextBridge.exposeInMainWorld('desktop', desktop);

export type DesktopApi = typeof desktop;
