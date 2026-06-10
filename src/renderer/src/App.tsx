import { DiffEditor, Editor, type DiffOnMount } from '@monaco-editor/react';
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
import { useCallback, useMemo, useRef, useState } from 'react';
import type { AppFile, DiffSession } from '@shared/types';
import tipCodeUrl from './assets/support/wechat-tip.jpg';
import {
  createUntitledFile,
  detectLanguage,
  markFileSaved,
  renameDiffSide,
  swapDiffSides,
  updateFileContent
} from './core/fileModel';

type ViewMode = 'editor' | 'diff';

const emptyDiff: DiffSession = {
  leftFileId: null,
  rightFileId: null,
  leftTitle: 'Left file',
  rightTitle: 'Right file'
};

export function App(): JSX.Element {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [diffSession, setDiffSession] = useState<DiffSession>(emptyDiff);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('Ready');
  const diffSessionRef = useRef(diffSession);
  diffSessionRef.current = diffSession;

  const activeFile = files.find((file) => file.id === activeFileId) ?? null;
  const leftFile = files.find((file) => file.id === diffSession.leftFileId) ?? null;
  const rightFile = files.find((file) => file.id === diffSession.rightFileId) ?? null;
  const dirtyCount = files.filter((file) => file.dirty).length;

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

  const openFiles = useCallback(async () => {
    try {
      const opened = await window.desktop.openFiles();
      const accepted = appendFiles(opened);
      if (accepted[0]) {
        setActiveFileId(accepted[0].id);
        setViewMode('editor');
        setMessage(`Opened ${accepted.length} file${accepted.length === 1 ? '' : 's'}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open files');
    }
  }, [appendFiles]);

  const createFile = useCallback(() => {
    const file = createUntitledFile(files.length + 1);
    setFiles((current) => [...current, file]);
    setActiveFileId(file.id);
    setViewMode('editor');
    setMessage('Created untitled file');
  }, [files.length]);

  const saveFile = useCallback(
    async (fileId: string | null = activeFileId) => {
      const file = files.find((item) => item.id === fileId);
      if (!file) {
        return;
      }

      try {
        if (file.path) {
          await window.desktop.saveFile(file.path, file.content);
          setFiles((current) => markFileSaved(current, file.id, file.content));
          setMessage(`Saved ${file.name}`);
          return;
        }

        const saved = await window.desktop.saveFileAs(file.name, file.content);
        if (!saved) {
          setMessage('Save canceled');
          return;
        }

        setFiles((current) => current.map((item) => (item.id === file.id ? saved : item)));
        setActiveFileId(saved.id);
        setDiffSession((session) => ({
          ...session,
          leftFileId: session.leftFileId === file.id ? saved.id : session.leftFileId,
          rightFileId: session.rightFileId === file.id ? saved.id : session.rightFileId
        }));
        setMessage(`Saved ${saved.name}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not save file');
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
      if (file?.dirty && !window.confirm(`${file.name} has unsaved changes. Close anyway?`)) {
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

      const droppedFiles = Array.from(event.dataTransfer.files);
      if (droppedFiles.length === 0) {
        return;
      }

      try {
        const opened = await window.desktop.readDroppedFiles(droppedFiles);
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
          setMessage('Opened dropped files in diff view');
          return;
        }

        if (accepted[0]) {
          setActiveFileId(accepted[0].id);
          setViewMode('editor');
          setMessage(`Opened ${accepted[0].name}`);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not read dropped files');
      }
    },
    [appendFiles]
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
        <button title="New file" onClick={createFile}>
          <FilePlus2 size={19} />
        </button>
        <button title="Open files" onClick={openFiles}>
          <FolderOpen size={19} />
        </button>
        <button title="Save active file" onClick={() => saveFile()}>
          <Save size={19} />
        </button>
        <button title="Diff view" onClick={() => setViewMode('diff')}>
          <Diff size={19} />
        </button>
        <button title="Support development" onClick={() => setIsTipOpen(true)}>
          <Gift size={19} />
        </button>
        <span className="activity-spacer" />
        <button title="Toggle sidebar" onClick={() => setIsSidebarOpen((value) => !value)}>
          {isSidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
        </button>
      </aside>

      {isSidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <Code2 size={17} />
            <span>CodeDiff Studio</span>
          </div>
          <div className="quick-actions">
            <button onClick={openFiles}>
              <FolderOpen size={16} />
              Open
            </button>
            <button onClick={() => saveFile()} disabled={!activeFile}>
              <Save size={16} />
              Save
            </button>
          </div>
          <section className="panel-section">
            <div className="panel-title">Files</div>
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
                  <span className="file-meta">{file.dirty ? 'modified' : file.language}</span>
                </button>
              ))}
              {files.length === 0 && <div className="empty-note">Drop files here or open from disk.</div>}
            </div>
          </section>
          <section className="panel-section">
            <div className="panel-title">Diff</div>
            <label>
              Left
              <select value={diffSession.leftFileId ?? ''} onChange={(event) => selectDiffFile('left', event.target.value)}>
                <option value="">Choose file</option>
                {files.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Right
              <select value={diffSession.rightFileId ?? ''} onChange={(event) => selectDiffFile('right', event.target.value)}>
                <option value="">Choose file</option>
                {files.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="diff-actions">
              <button onClick={() => useActiveForDiff('left')} disabled={!activeFile}>
                Set left
              </button>
              <button onClick={() => useActiveForDiff('right')} disabled={!activeFile}>
                Set right
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
            <button className="tab utility" title="Search is available inside Monaco with Ctrl/Cmd+F">
              <Search size={15} />
            </button>
          </div>
          <div className="topbar-actions">
            <button onClick={saveAll} disabled={dirtyCount === 0}>
              Save all
            </button>
            <button className={viewMode === 'diff' ? 'selected' : ''} onClick={() => setViewMode('diff')}>
              Diff
            </button>
          </div>
        </div>

        <section className="editor-surface">
          {viewMode === 'editor' && activeFile && (
            <Editor
              key={activeFile.id}
              theme="vs-dark"
              language={activeFile.language || detectLanguage(activeFile.name)}
              value={activeFile.content}
              options={editorOptions}
              onChange={(value) => updateContent(activeFile.id, value)}
            />
          )}

          {viewMode === 'editor' && !activeFile && (
            <div className="welcome">
              <Code2 size={42} />
              <h1>CodeDiff Studio</h1>
              <p>Open, edit, and compare source files from your desktop.</p>
              <div className="welcome-actions">
                <button onClick={openFiles}>
                  <FolderOpen size={17} />
                  Open files
                </button>
                <button onClick={createFile}>
                  <FilePlus2 size={17} />
                  New file
                </button>
              </div>
            </div>
          )}

          {viewMode === 'diff' && leftFile && rightFile && (
            <DiffEditor
              key={`${leftFile.id}:${rightFile.id}`}
              theme="vs-dark"
              language={rightFile.language || leftFile.language}
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
              <h1>Select two files</h1>
              <p>Use the Diff panel or drop two files into the window.</p>
            </div>
          )}
        </section>

        <footer className="statusbar">
          <span>{activeFile?.path ?? activeFile?.name ?? 'No file selected'}</span>
          <span>{activeFile?.language ?? 'plaintext'}</span>
          <span>{dirtyCount > 0 ? `${dirtyCount} unsaved` : 'Saved'}</span>
          <span>{message}</span>
        </footer>
      </main>

      {isDragging && <div className="drop-overlay">Drop one file to edit, or two files to compare.</div>}

      {isTipOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="tip-modal">
            <button className="modal-close" title="Close" onClick={() => setIsTipOpen(false)}>
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
