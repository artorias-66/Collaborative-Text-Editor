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
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { documentAPI, aiAPI } from '../../services/api';
import socketService from '../../services/socket';

const Editor = ({ user, onLogout }) => {
  const { id, shareLink } = useParams();
  const navigate = useNavigate();
  const quillRef = useRef(null);
  const [document, setDocument] = useState(null);
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
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const changeTimeoutRef = useRef(null);
  const isRemoteChangeRef = useRef(false);

  useEffect(() => {
    loadDocument();
    return () => {
      socketService.disconnect();
    };
  }, [id, shareLink]);

  useEffect(() => {
    if (document && quillRef.current) {
      setupSocket();
    }
    return () => {
      if (document) {
        socketService.leaveDocument(document._id);
      }
    };
  }, [document]);

  const loadDocument = async () => {
    try {
      let response;
      if (shareLink) {
        response = await documentAPI.getSharedDocument(shareLink);
      } else {
        response = await documentAPI.getDocument(id);
      }

      const doc = response.data.document;
      setDocument(doc);
      setTitle(doc.title);
      setContent(doc.content || '');
      setLastSaved(doc.lastSaved);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document');
      setTimeout(() => navigate('/dashboard'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = async () => {
    try {
      await socketService.connect();
      const documentId = document._id;

      socketService.joinDocument(documentId);

      socketService.on('document-loaded', (data) => {
        if (quillRef.current && !isRemoteChangeRef.current) {
          const quill = quillRef.current.getEditor();
          if (data.content) {
            quill.clipboard.dangerouslyPasteHTML(data.content);
          }
        }
      });

      socketService.on('text-change', (data) => {
        if (data.userId && data.userId.toString() !== user.id?.toString() && quillRef.current) {
          isRemoteChangeRef.current = true;
          const quill = quillRef.current.getEditor();
          if (data.delta) {
            quill.updateContents(data.delta);
          } else if (data.content !== undefined) {
            // Fallback: update content if delta not available
            const currentContent = quill.root.innerHTML;
            if (currentContent !== data.content) {
              quill.clipboard.dangerouslyPasteHTML(data.content);
            }
          }
          isRemoteChangeRef.current = false;
        }
      });

      socketService.on('user-joined', (data) => {
        setConnectedUsers(prev => [...prev.filter(u => u !== data.userId), data.userId]);
      });

      socketService.on('user-left', (data) => {
        setConnectedUsers(prev => prev.filter(u => u !== data.userId));
      });

      socketService.on('document-saved', (data) => {
        setLastSaved(new Date(data.timestamp));
      });

      socketService.on('cursor-move', (data) => {
        // Handle cursor positions from other users
        // This would require more complex implementation with Quill cursors
      });

      socketService.on('error', (data) => {
        setError(data.message);
      });
    } catch (error) {
      console.error('Socket setup error:', error);
    }
  };

  const handleContentChange = (value, delta, source, editor) => {
    if (source === 'user' && !isRemoteChangeRef.current) {
      setContent(value);

      // Debounce auto-save
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }

      changeTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 30000); // Auto-save after 30 seconds

      // Send change to other users
      if (document && delta) {
        socketService.sendTextChange(document._id, delta, value);
      }
    }
  };

  const autoSave = async () => {
    if (!document || saving) return;

    try {
      setSaving(true);
      await documentAPI.updateDocument(document._id, { content, title });
      socketService.saveDocument(document._id, content, title);
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
      await documentAPI.updateDocument(document._id, { content, title });
      socketService.saveDocument(document._id, content, title);
      setLastSaved(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (document) {
      documentAPI.updateDocument(document._id, { title: newTitle });
    }
  };

  const handleAIRequest = async () => {
    // Extract plain text from content using Quill's built-in method
    const getPlainText = () => {
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        return quill.getText().trim();
      }
      // Fallback: strip HTML tags
      if (!content) return '';
      return content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };

    // Use document content if input is empty
    const plainContent = getPlainText();
    const textToAnalyze = aiInput.trim() || plainContent;

    if (!textToAnalyze || textToAnalyze.length === 0) {
      setError('Please enter text to analyze or ensure your document has content');
      return;
    }

    setAiLoading(true);
    setAiResult('');

    try {
      let response;

      switch (aiTab) {
        case 0: // Grammar Check
          response = await aiAPI.grammarCheck(textToAnalyze);
          break;
        case 1: // Enhance
          response = await aiAPI.enhance(textToAnalyze);
          break;
        case 2: // Summarize
          response = await aiAPI.summarize(textToAnalyze);
          break;
        case 3: // Complete
          response = await aiAPI.complete(textToAnalyze, plainContent);
          break;
        case 4: // Suggestions
          response = await aiAPI.getSuggestions(textToAnalyze);
          break;
        default:
          response = await aiAPI.grammarCheck(textToAnalyze);
      }

      setAiResult(response.data.result);
    } catch (err) {
      setError(err.response?.data?.error || 'AI service error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAIResult = () => {
    if (aiResult && quillRef.current) {
      const quill = quillRef.current.getEditor();

      // Get current selection
      const selection = quill.getSelection(true);

      if (selection && selection.length > 0) {
        // Replace selected text
        quill.deleteText(selection.index, selection.length, 'user');
        // Insert as plain text (strip HTML tags if present)
        const plainText = aiResult.replace(/<[^>]*>/g, '').trim();
        quill.insertText(selection.index, plainText, 'user');
        quill.setSelection(selection.index + plainText.length, 'user');
      } else {
        // Replace entire content
        // Strip HTML tags and insert as plain text, or use HTML if it's well-formed
        const isHTML = /<[^>]+>/.test(aiResult);
        if (isHTML) {
          quill.clipboard.dangerouslyPasteHTML(aiResult, 'user');
        } else {
          quill.setText(aiResult, 'user');
        }
      }

      // Get updated content and update state
      const updatedContent = quill.root.innerHTML;
      setContent(updatedContent);

      // Trigger content change handler to sync with server
      handleContentChange(updatedContent, null, 'user', quill);

      // Clear AI result and close drawer
      setAiResult('');
      setAiInput('');
      setAiDrawerOpen(false);
    }
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AIIcon sx={{ color: '#ec4899' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AI Assistant
            </Typography>
          </Box>

          <Tabs
            value={aiTab}
            onChange={(e, v) => setAiTab(v)}
            sx={{
              mb: 3,
              '& .MuiTab-root': { minWidth: 'auto', px: 1.5, fontSize: '0.8rem' }
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Grammar" />
            <Tab label="Enhance" />
            <Tab label="Summarize" />
            <Tab label="Complete" />
            <Tab label="Suggestions" />
          </Tabs>

          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter text to analyze (leave empty to use document content)"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            sx={{ mb: 3 }}
            variant="outlined"
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleAIRequest}
            disabled={aiLoading}
            startIcon={<AIIcon />}
            sx={{
              mb: 3,
              background: 'linear-gradient(45deg, #6366f1, #ec4899)',
              py: 1.5
            }}
          >
            {aiLoading ? 'Processing...' : 'Analyze Text'}
          </Button>

          {aiResult && (
            <Paper
              sx={{
                p: 2,
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2
              }}
            >
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#818cf8' }}>
                Result:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2, color: '#cbd5e1' }}>
                {aiResult}
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleApplyAIResult}
                startIcon={<CheckCircleIcon />}
                size="small"
              >
                Apply to Document
              </Button>
            </Paper>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Editor;

