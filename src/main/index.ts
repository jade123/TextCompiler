import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppFile, SaveFileAsRequest } from '../shared/types';
import { detectLanguageMode, LANGUAGE_MODES } from '../shared/languages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

async function readAppFile(filePath: string): Promise<AppFile> {
  const content = await fs.readFile(filePath, 'utf8');
  return {
    id: `${filePath}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    name: path.basename(filePath),
    path: filePath,
    content,
    language: detectLanguageMode(filePath),
    dirty: false,
    lastSavedContent: content
  };
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: '文本阅读器',
    backgroundColor: '#151515',
    icon: path.join(app.getAppPath(), 'build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('files:open', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开文件',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '文本和代码', extensions: Array.from(new Set(LANGUAGE_MODES.flatMap((mode) => mode.extensions))) },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return Promise.all(result.filePaths.map(readAppFile));
});

ipcMain.handle('files:read-dropped', async (_event, filePaths: string[]) => {
  return Promise.all(filePaths.map(readAppFile));
});

ipcMain.handle('files:save', async (_event, filePath: string, content: string) => {
  await fs.writeFile(filePath, content, 'utf8');
});

ipcMain.handle('files:save-as', async (_event, request: SaveFileAsRequest) => {
  const result = await dialog.showSaveDialog({
    title: '另存为',
    defaultPath: request.defaultName
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  await fs.writeFile(result.filePath, request.content, 'utf8');
  return readAppFile(result.filePath);
});

ipcMain.handle('files:show-in-folder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});
