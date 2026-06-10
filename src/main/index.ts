import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppFile, SaveFileAsRequest } from '../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

const languageByExtension: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.json': 'json',
  '.md': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.xml': 'xml',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.sql': 'sql',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.sh': 'shell',
  '.zsh': 'shell',
  '.txt': 'plaintext'
};

function detectLanguage(filePath: string): string {
  return languageByExtension[path.extname(filePath).toLowerCase()] ?? 'plaintext';
}

async function readAppFile(filePath: string): Promise<AppFile> {
  const content = await fs.readFile(filePath, 'utf8');
  return {
    id: `${filePath}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    name: path.basename(filePath),
    path: filePath,
    content,
    language: detectLanguage(filePath),
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
    title: 'CodeDiff Studio',
    backgroundColor: '#151515',
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
    title: 'Open files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Code and Text', extensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'md', 'css', 'html', 'py', 'go', 'rs', 'java', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
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
    title: 'Save file as',
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
