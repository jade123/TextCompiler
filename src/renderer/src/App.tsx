import { DiffEditor, Editor, type DiffOnMount } from '@monaco-editor/react';
import { listen } from '@tauri-apps/api/event';
import {
  ArrowLeftRight,
  Code2,
  Diff,
  FilePlus2,
  FolderOpen,
  Gift,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Search,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppFile, DiffSession } from '../../shared/types';
import { getLanguageLabel, getMonacoLanguage, LANGUAGE_MODES } from '../../shared/languages';
import tipCodeUrl from './assets/support/wechat-tip.jpg';
import { desktop } from './desktop';
import {
  createUntitledFile,
  detectLanguage,
  markFileSaved,
  renameDiffSide,
  swapDiffSides,
  updateFileLanguage,
  updateFileContent
} from './core/fileModel';
import { shouldShowTipPrompt } from './core/tipPrompt';

type ViewMode = 'editor' | 'diff';

const emptyDiff: DiffSession = {
  leftFileId: null,
  rightFileId: null,
  leftTitle: '左侧文件',
  rightTitle: '右侧文件'
};

export function App(): JSX.Element {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [diffSession, setDiffSession] = useState<DiffSession>(emptyDiff);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('就绪');
  const diffSessionRef = useRef(diffSession);
  diffSessionRef.current = diffSession;

  const activeFile = files.find((file) => file.id === activeFileId) ?? null;
  const leftFile = files.find((file) => file.id === diffSession.leftFileId) ?? null;
  const rightFile = files.find((file) => file.id === diffSession.rightFileId) ?? null;
  const dirtyCount = files.filter((file) => file.dirty).length;

  useEffect(() => {
    if (shouldShowTipPrompt()) {
      setIsTipOpen(true);
    }
  }, []);

  const appendFiles = useCallback((incoming: AppFile[]) => {
    if (incoming.length === 0) {
      return [];
    }

    const existingByPath = new Map(files.filter((file) => file.path).map((file) => [file.path, file]));
    const accepted = incoming.filter((file) => !file.path || !existingByPath.has(file.path));
    const resolved = incoming.map((file) => (file.path ? existingByPath.get(file.path) ?? file : file));

    if (accepted.length > 0) {
      setFiles((current) => [...current, ...accepted]);
    }

    return resolved;
  }, [files]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;

    listen<{ paths?: string[] } | string[]>('tauri://drag-drop', async (event) => {
      const filePaths = Array.isArray(event.payload) ? event.payload : event.payload.paths ?? [];

      if (disposed || filePaths.length === 0) {
        return;
      }

      try {
        const opened = await desktop.readDroppedFiles(filePaths);
        const accepted = appendFiles(opened);

        if (accepted.length >= 2) {
          setDiffSession({
            leftFileId: accepted[0].id,
            rightFileId: accepted[1].id,
            leftTitle: accepted[0].name,
            rightTitle: accepted[1].name
          });
          setActiveFileId(accepted[1].id);
          setViewMode('diff');
          setMessage('已用差异对比打开拖入的文件');
          return;
        }

        if (accepted[0]) {
          setActiveFileId(accepted[0].id);
          setViewMode('editor');
          setMessage(`已打开 ${accepted[0].name}`);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '无法读取拖入的文件');
      }
    })
      .then((handler) => {
        unlisten = handler;
      })
      .catch(() => {
        setMessage('拖拽监听初始化失败');
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appendFiles]);

  const openFiles = useCallback(async () => {
    try {
      const opened = await desktop.openFiles();
      const accepted = appendFiles(opened);
      if (accepted[0]) {
        setActiveFileId(accepted[0].id);
        setViewMode('editor');
        setMessage(`已打开 ${accepted.length} 个文件`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法打开文件');
    }
  }, [appendFiles]);

  const createFile = useCallback(() => {
    const file = createUntitledFile(files.length + 1);
    setFiles((current) => [...current, file]);
    setActiveFileId(file.id);
    setViewMode('editor');
    setMessage('已新建未命名文件');
  }, [files.length]);

  const saveFile = useCallback(
    async (fileId: string | null = activeFileId) => {
      const file = files.find((item) => item.id === fileId);
      if (!file) {
        return;
      }

      try {
        if (file.path) {
          await desktop.saveFile(file.path, file.content);
          setFiles((current) => markFileSaved(current, file.id, file.content));
          setMessage(`已保存 ${file.name}`);
          return;
        }

        const saved = await desktop.saveFileAs(file.name, file.content);
        if (!saved) {
          setMessage('已取消保存');
          return;
        }

        setFiles((current) => current.map((item) => (item.id === file.id ? saved : item)));
        setActiveFileId(saved.id);
        setDiffSession((session) => ({
          ...session,
          leftFileId: session.leftFileId === file.id ? saved.id : session.leftFileId,
          rightFileId: session.rightFileId === file.id ? saved.id : session.rightFileId
        }));
        setMessage(`已保存 ${saved.name}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '无法保存文件');
      }
    },
    [activeFileId, files]
  );

  const saveAll = useCallback(async () => {
    for (const file of files.filter((item) => item.dirty)) {
      await saveFile(file.id);
    }
  }, [files, saveFile]);

  const closeFile = useCallback(
    (fileId: string) => {
      const file = files.find((item) => item.id === fileId);
      if (file?.dirty && !window.confirm(`${file.name} 有未保存的修改，确定关闭吗？`)) {
        return;
      }

      setFiles((current) => current.filter((item) => item.id !== fileId));
      setDiffSession((session) => ({
        ...session,
        leftFileId: session.leftFileId === fileId ? null : session.leftFileId,
        rightFileId: session.rightFileId === fileId ? null : session.rightFileId
      }));

      if (activeFileId === fileId) {
        const nextFile = files.find((item) => item.id !== fileId);
        setActiveFileId(nextFile?.id ?? null);
      }
    },
    [activeFileId, files]
  );

  const updateContent = useCallback((fileId: string, content: string | undefined) => {
    if (content === undefined) {
      return;
    }

    setFiles((current) => updateFileContent(current, fileId, content));
  }, []);

  const updateLanguage = useCallback((fileId: string, language: string) => {
    setFiles((current) => updateFileLanguage(current, fileId, language));
    setMessage(`语言模式已切换为 ${getLanguageLabel(language)}`);
  }, []);

  const selectDiffFile = useCallback((side: 'left' | 'right', fileId: string) => {
    const selected = files.find((file) => file.id === fileId) ?? null;
    setDiffSession((session) => renameDiffSide(session, side, selected));
    setViewMode('diff');
  }, [files]);

  const useActiveForDiff = useCallback(
    (side: 'left' | 'right') => {
      if (!activeFile) {
        return;
      }

      setDiffSession((session) => renameDiffSide(session, side, activeFile));
      setViewMode('diff');
    },
    [activeFile]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      setMessage('正在读取拖入的文件');
    },
    []
  );

  const diffMount: DiffOnMount = useCallback(
    (editor) => {
      const model = editor.getModel();
      const originalModel = model?.original;
      const modifiedModel = model?.modified;

      const originalDispose = originalModel?.onDidChangeContent(() => {
        const currentLeft = diffSessionRef.current.leftFileId;
        if (currentLeft) {
          updateContent(currentLeft, originalModel.getValue());
        }
      });

      const modifiedDispose = modifiedModel?.onDidChangeContent(() => {
        const currentRight = diffSessionRef.current.rightFileId;
        if (currentRight) {
          updateContent(currentRight, modifiedModel.getValue());
        }
      });

      editor.onDidDispose(() => {
        originalDispose?.dispose();
        modifiedDispose?.dispose();
      });
    },
    [updateContent]
  );

  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: true },
      fontSize: 14,
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      lineHeight: 21,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      automaticLayout: true,
      tabSize: 2
    }),
    []
  );

  return (
    <div
      className={`app-shell ${isDragging ? 'dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <aside className={`activity-bar ${isSidebarOpen ? 'open' : ''}`}>
        <button title="新建文件" onClick={createFile}>
          <FilePlus2 size={19} />
        </button>
        <button title="打开文件" onClick={openFiles}>
          <FolderOpen size={19} />
        </button>
        <button title="保存当前文件" onClick={() => saveFile()}>
          <Save size={19} />
        </button>
        <button title="差异对比" onClick={() => setViewMode('diff')}>
          <Diff size={19} />
        </button>
        <button title="支持开发" onClick={() => setIsTipOpen(true)}>
          <Gift size={19} />
        </button>
        <span className="activity-spacer" />
        <button title="显示或隐藏侧边栏" onClick={() => setIsSidebarOpen((value) => !value)}>
          {isSidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>
      </aside>

      {isSidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <Code2 size={17} />
            <span>文本阅读器</span>
          </div>
          <div className="quick-actions">
            <button onClick={openFiles}>
              <FolderOpen size={16} />
              打开
            </button>
            <button onClick={() => saveFile()} disabled={!activeFile}>
              <Save size={16} />
              保存
            </button>
          </div>
          <section className="panel-section">
            <div className="panel-title">文件</div>
            <div className="file-list">
              {files.map((file) => (
                <button
                  key={file.id}
                  className={`file-row ${file.id === activeFileId ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFileId(file.id);
                    setViewMode('editor');
                  }}
                >
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta">{file.dirty ? '已修改' : getLanguageLabel(file.language)}</span>
                </button>
              ))}
              {files.length === 0 && <div className="empty-note">拖入文件，或从磁盘打开文件。</div>}
            </div>
          </section>
          <section className="panel-section">
            <div className="panel-title">差异对比</div>
            <label>
              左侧文件
              <select value={diffSession.leftFileId ?? ''} onChange={(event) => selectDiffFile('left', event.target.value)}>
                <option value="">选择文件</option>
                {files.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              右侧文件
              <select value={diffSession.rightFileId ?? ''} onChange={(event) => selectDiffFile('right', event.target.value)}>
                <option value="">选择文件</option>
                {files.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="diff-actions">
              <button onClick={() => useActiveForDiff('left')} disabled={!activeFile}>
                设置左侧
              </button>
              <button onClick={() => useActiveForDiff('right')} disabled={!activeFile}>
                设置右侧
              </button>
              <button onClick={() => setDiffSession((session) => swapDiffSides(session))} disabled={!leftFile && !rightFile}>
                <ArrowLeftRight size={15} />
              </button>
            </div>
          </section>
        </aside>
      )}

      <main className="workspace">
        <div className="topbar">
          <div className="tab-strip">
            {files.map((file) => (
              <button
                key={file.id}
                className={`tab ${file.id === activeFileId && viewMode === 'editor' ? 'active' : ''}`}
                onClick={() => {
                  setActiveFileId(file.id);
                  setViewMode('editor');
                }}
              >
                <span>{file.dirty ? '● ' : ''}{file.name}</span>
                <X
                  size={14}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeFile(file.id);
                  }}
                />
              </button>
            ))}
            <button className="tab utility" title="可在编辑器内使用 Ctrl/Cmd+F 搜索">
              <Search size={15} />
            </button>
          </div>
          <div className="topbar-actions">
            <label className="language-select">
              <span>语言模式</span>
              <select
                value={activeFile?.language ?? 'plaintext'}
                onChange={(event) => activeFile && updateLanguage(activeFile.id, event.target.value)}
                disabled={!activeFile}
              >
                {LANGUAGE_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={saveAll} disabled={dirtyCount === 0}>
              保存全部
            </button>
            <button className={viewMode === 'diff' ? 'selected' : ''} onClick={() => setViewMode('diff')}>
              差异对比
            </button>
          </div>
        </div>

        <section className="editor-surface">
          {viewMode === 'editor' && activeFile && (
            <Editor
              key={activeFile.id}
              theme="vs-dark"
              language={getMonacoLanguage(activeFile.language || detectLanguage(activeFile.name))}
              value={activeFile.content}
              options={editorOptions}
              onChange={(value) => updateContent(activeFile.id, value)}
            />
          )}

          {viewMode === 'editor' && !activeFile && (
            <div className="welcome">
              <Code2 size={42} />
              <h1>文本阅读器</h1>
              <p>从桌面打开、编辑并对比文本和代码文件。</p>
              <div className="welcome-actions">
                <button onClick={openFiles}>
                  <FolderOpen size={17} />
                  打开文件
                </button>
                <button onClick={createFile}>
                  <FilePlus2 size={17} />
                  新建文件
                </button>
              </div>
            </div>
          )}

          {viewMode === 'diff' && leftFile && rightFile && (
            <DiffEditor
              key={`${leftFile.id}:${rightFile.id}`}
              theme="vs-dark"
              language={getMonacoLanguage(rightFile.language || leftFile.language)}
              original={leftFile.content}
              modified={rightFile.content}
              options={{
                ...editorOptions,
                originalEditable: true,
                renderSideBySide: true,
                ignoreTrimWhitespace: false
              }}
              onMount={diffMount}
            />
          )}

          {viewMode === 'diff' && (!leftFile || !rightFile) && (
            <div className="welcome">
              <Diff size={42} />
              <h1>选择两个文件</h1>
              <p>使用左侧差异面板，或直接拖入两个文件。</p>
            </div>
          )}
        </section>

        <footer className="statusbar">
          <span>{activeFile?.path ?? activeFile?.name ?? '未选择文件'}</span>
          <span>{activeFile ? getLanguageLabel(activeFile.language) : '纯文本'}</span>
          <span>{dirtyCount > 0 ? `${dirtyCount} 个未保存` : '已保存'}</span>
          <span>{message}</span>
        </footer>
      </main>

      {isDragging && <div className="drop-overlay">拖入一个文件进行编辑，或拖入两个文件进行对比。</div>}

      {isTipOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="tip-modal">
            <button className="modal-close" title="关闭" onClick={() => setIsTipOpen(false)}>
              <X size={18} />
            </button>
            <h2>支持开发</h2>
            <p>开发不易，谢谢打赏</p>
            <img src={tipCodeUrl} alt="微信打赏码" />
          </div>
        </div>
      )}
    </div>
  );
}
