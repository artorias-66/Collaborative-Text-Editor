import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Drawer,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill';
import { documentAPI, aiAPI } from '../../services/api';
// Keep socketService for other features if needed (like user presence? Yjs has presence too)
import socketService from '../../services/socket';

// Helper to define User interface if not existing, or just use any for now
interface User {
  id: string;
  name: string;
}

interface EditorProps {
  user: User;
  onLogout: () => void;
}

const Editor: React.FC<EditorProps> = ({ user, onLogout }) => {
  const { id, shareLink } = useParams<{ id: string; shareLink: string }>();
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);
  const [document, setDocument] = useState<any>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiTab, setAiTab] = useState(0);
  const [aiInput, setAiInput] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDocument();
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, [id, shareLink]);

  const loadDocument = async () => {
    try {
      let response;
      if (shareLink) {
        response = await documentAPI.getSharedDocument(shareLink);
      } else {
        response = await documentAPI.getDocument(id as string);
      }

      const doc = response.data.document;
      setDocument(doc);
      setTitle(doc.title);
      // Content will be loaded via Yjs or fallback
      const initialContent = doc.content || '';
      setContent(initialContent);
      setLastSaved(doc.lastSaved);

      // Initialize Yjs after loading doc metadata
      setupYjs(doc._id, initialContent);

    } catch (err: any) {
      console.error('Load Error:', err);
      setError(err.response?.data?.error || 'Failed to load document');
      setTimeout(() => navigate('/dashboard'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const setupYjs = (docId: string, initialContent: string) => {
    if (!quillRef.current) return;

    // 1. Create Yjs Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // 2. Connect to Websocket Provider
    // Server URL: ws://localhost:5000/yjs (or env)
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:5000';
    // Remove http/https and replace with ws/wss logic if needed, but y-websocket handles 'ws://'
    // If socketUrl is 'http://...', replace with 'ws://...'
    const wsUrl = socketUrl.replace(/^http/, 'ws');

    // We append /yjs to the path or let the server handle it? 
    // y-websocket client construction: new WebsocketProvider(serverUrl, roomName)
    // It connects to `serverUrl/roomName` basically? No.
    // It creates `new WebSocket(serverUrl)`? 
    // Actually, looking at y-websocket source:
    // `new WebSocket(serverUrl + '/' + roomname)`
    // So if we want `ws://localhost:5000/yjs/docID`, we pass `ws://localhost:5000/yjs` as serverUrl.
    const provider = new WebsocketProvider(
      wsUrl + '/yjs',
      docId,
      ydoc
    );
    providerRef.current = provider;

    // 3. Bind to Quill
    const type = ydoc.getText('quill');
    const editor = quillRef.current.getEditor();
    const binding = new QuillBinding(type, editor, provider.awareness);

    // 4. Handle Migration / Initial Content
    // Check if Yjs doc is empty from server (wait for sync?)
    // provider.on('synced', ...)
    provider.on('synced' as any, (isSynced: boolean) => {
      if (isSynced) {
        // If Yjs doc is empty but we have initialContent from DB, insert it
        if (type.length === 0 && initialContent.length > 0) {
          // Insert initial content
          // To be safe, we should convert HTML to text/delta.
          // Quill can do this.
          // Note: We should be careful about overwriting if another user just joined and inserted.
          // Simple heuristic: only if map is empty and we are creating it?
          // For now, let's just insert if empty.
          const delta = editor.clipboard.convert({ html: initialContent } as any);
          editor.setContents(delta, 'silent'); // Updates yjs via binding? No, 'silent' doesn't trigger 'text-change' usually.
          // We need to update Yjs type specifically.
          // QuillBinding listens to 'text-change'.
          // If we setContents with 'api', it triggers.
          editor.setContents(delta, 'api');
        }
      }
    });

    // 5. User Awareness (Presence)
    // Set local user info
    provider.awareness.setLocalStateField('user', {
      name: user.name,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random color
    });

    provider.awareness.on('change', () => {
      // Update connected users list
      const states = Array.from(provider.awareness.getStates().values());
      const users = states.map((s: any) => s.user?.name).filter(Boolean);
      // Deduplicate
      setConnectedUsers(Array.from(new Set(users)));
    });
  };

  const handleContentChange = (value: string, delta: any, source: string, editor: any) => {
    // Update local state for saving
    if (source === 'user' || source === 'api') {
      setContent(value);
      // Debounce save to DB (metadata/backup)
      if (changeTimeoutRef.current) clearTimeout(changeTimeoutRef.current);
      changeTimeoutRef.current = setTimeout(() => autoSave(value), 30000);
    }
  };

  const autoSave = async (currentContent: string) => {
    if (!document || saving) return;
    try {
      setSaving(true);
      await documentAPI.updateDocument(document._id, { content: currentContent, title });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    try {
      setSaving(true);
      // Get latest content from quill directly
      const currentContent = quillRef.current?.getEditor().root.innerHTML || content;
      await documentAPI.updateDocument(document._id, { content: currentContent, title });
      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ... Keep AI handlers and UI ...
  // [Truncated for brevity in thought, but I will include full code in tool call]
  // I need to include the full file content including imports and helper functions
  // I will copy the UI parts from previous file view.

  // Auto-fill selected text when drawer opens
  useEffect(() => {
    if (aiDrawerOpen && quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();
      if (range && range.length > 0) {
        const selectedText = editor.getText(range.index, range.length);
        setAiInput(selectedText);
      } else {
        // Optional: clear input if no selection? Or keep previous?
        // User might want to type. Let's keep it empty or previous.
        // If we want to support "auto pick whole doc", we can hint it or just leave empty.
        setAiInput('');
      }
    }
  }, [aiDrawerOpen]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (document) {
      documentAPI.updateDocument(document._id, { title: newTitle });
    }
  };

  // Strip any explanations the AI might add despite prompts
  const stripExplanations = (text: string): string => {
    let cleaned = text.trim();
    // Cut at common explanation markers
    const markers = [/\*\*Brief/i, /\*\*Explanation/i, /\*\*Changes/i, /\*\*Note/i, /\n---/];
    for (const m of markers) {
      const match = cleaned.match(m);
      if (match?.index !== undefined) {
        cleaned = cleaned.substring(0, match.index);
        break;
      }
    }
    // Remove lines starting with bullets
    cleaned = cleaned.split('\n').filter(line => {
      const t = line.trim();
      return !t.startsWith('*') && !t.startsWith('-');
    }).join('\n');
    // Remove bold markers
    cleaned = cleaned.replace(/\*\*/g, '');
    return cleaned.trim();
  };

  const handleAIRequest = async () => {
    // If input is empty, use full document text
    let textToAnalyze = aiInput.trim();
    if (!textToAnalyze && quillRef.current) {
      textToAnalyze = quillRef.current.getEditor().getText();
    }

    if (!textToAnalyze) return;

    setAiLoading(true);
    setAiResult('');
    setError('');

    try {
      const endpoints = ['/grammar-check', '/enhance', '/summarize'];
      const endpoint = endpoints[aiTab];
      let fullResult = '';

      await aiAPI.stream(endpoint, { text: textToAnalyze }, (chunk: any) => {
        if (chunk.error) {
          setError(chunk.error);
        } else if (chunk.text) {
          fullResult += chunk.text;
        }
      });

      // Strip explanations from the completed response
      setAiResult(stripExplanations(fullResult));
    } catch (err: any) {
      console.error(err);
      setError('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAIResult = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection();

      // Use the result directly (no separator parsing needed)
      const suggestion = aiResult.trim();

      if (range && range.length > 0) {
        editor.deleteText(range.index, range.length);
        editor.insertText(range.index, suggestion, 'user');
      } else {
        // If no selection, insert at cursor
        const index = range ? range.index : editor.getLength() - 1;
        editor.insertText(index, suggestion, 'user');
      }
    }
    setAiDrawerOpen(false);
  };

  // ... modules/formats ...
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background', 'align',
    'link', 'image'
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <TextField
            value={title}
            onChange={handleTitleChange}
            variant="standard"
            placeholder="Untitled Document"
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc' }
            }}
            sx={{
              flexGrow: 1,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                borderRadius: 1,
                transition: 'background 0.2s',
                '&:hover': { background: 'rgba(255,255,255,0.05)' },
                '&:focus': { background: 'rgba(255,255,255,0.1)' }
              }
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {connectedUsers.length > 0 && (
              <Chip
                label={`${connectedUsers.length} online`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              />
            )}
            {lastSaved && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </Typography>
            )}
            <IconButton
              color="inherit"
              onClick={() => setAiDrawerOpen(true)}
              sx={{
                background: 'linear-gradient(45deg, #6366f1, #ec4899)',
                '&:hover': { opacity: 0.9 }
              }}
            >
              <AIIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleManualSave}
              disabled={saving}
              sx={{ borderRadius: 2 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'transparent',
            '& .ql-container': { flexGrow: 1, overflow: 'hidden' }
          }}
        >
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={modules}
            formats={formats}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          />
        </Paper>
      </Box>

      {/* AI Drawer */}
      <Drawer
        anchor="right"
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 400,
            background: '#0f172a',
            borderLeft: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, background: 'linear-gradient(45deg, #6366f1, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Assistant
          </Typography>

          <Tabs
            value={aiTab}
            onChange={(e, v) => setAiTab(v)}
            sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.7)' }, '& .Mui-selected': { color: '#818cf8' } }}
            indicatorColor="primary"
          >
            <Tab label="Grammar" />
            <Tab label="Enhance" />
            <Tab label="Summarize" />
          </Tabs>

          <TextField
            fullWidth
            multiline
            rows={4}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="Selected text will appear here..."
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                background: 'rgba(255,255,255,0.05)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' }
              }
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleAIRequest}
            disabled={aiLoading}
            sx={{
              background: 'linear-gradient(45deg, #6366f1, #ec4899)',
              mb: 3
            }}
          >
            {aiLoading ? <CircularProgress size={24} color="inherit" /> : 'Analyze'}
          </Button>

          {aiResult && (
            <Box sx={{ p: 2, border: '1px solid #4ade80', borderRadius: 2, bgcolor: 'rgba(74, 222, 128, 0.05)' }}>
              <Typography variant="subtitle2" sx={{ color: '#4ade80', mb: 1, fontWeight: 600 }}>
                Suggestion
              </Typography>
              <Typography variant="body2" sx={{ color: '#f0fdf4', whiteSpace: 'pre-wrap', mb: 2 }}>{aiResult}</Typography>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={handleApplyAIResult}
                startIcon={<CheckCircleIcon />}
              >
                Apply Fix
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Editor;
