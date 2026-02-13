import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { documentAPI } from '../../services/api';

interface Document {
  _id: string;
  title: string;
  lastSaved: string;
}

const Dashboard = ({ user, onLogout }: { user: any, onLogout: () => void }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentAPI.getDocuments();
      setDocuments(response.data.documents);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      setError('Title is required');
      return;
    }

    try {
      const response = await documentAPI.createDocument({ title: newDocTitle });
      navigate(`/document/${response.data.document._id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentAPI.deleteDocument(id);
      loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleShareDocument = async (id: string) => {
    try {
      const response = await documentAPI.shareDocument(id);
      const link = response.data.shareLink;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      setSnackbarOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate share link');
    }
  };

  const handleOpenDocument = (id: string) => {
    navigate(`/document/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 700, background: 'linear-gradient(45deg, #6366f1, #ec4899)', backgroundClip: 'text', textFillColor: 'transparent' }}>
            Collaborative Editor
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Welcome, {user?.username}
            </Typography>
            <Button color="inherit" onClick={onLogout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 6 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>My Documents</Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ borderRadius: 3, px: 4 }}
          >
            New Document
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : documents.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No documents yet
            </Typography>
            <Typography color="text.secondary" paragraph>
              Create your first document to start collaborating!
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
              Create Document
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {documents.map((doc) => (
              <Paper
                key={doc._id}
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'rgba(30, 41, 59, 0.6)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                  }
                }}
                onClick={() => handleOpenDocument(doc._id)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                    {doc.title}
                  </Typography>
                  <Box onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => handleShareDocument(doc._id)} sx={{ color: 'primary.light' }}>
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteDocument(doc._id)} sx={{ color: 'error.light' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Last saved: {new Date(doc.lastSaved).toLocaleDateString()} at {new Date(doc.lastSaved).toLocaleTimeString()}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Container>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            background: '#1e293b',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Document Title"
            fullWidth
            variant="outlined"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateDocument();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateDocument} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="Link copied!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default Dashboard;


