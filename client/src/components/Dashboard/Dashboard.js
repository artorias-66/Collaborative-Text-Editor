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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { documentAPI } from '../../services/api';

const Dashboard = ({ user, onLogout }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create document');
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentAPI.deleteDocument(id);
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleShareDocument = async (id) => {
    try {
      const response = await documentAPI.shareDocument(id);
      setShareLink(response.data.shareLink);
      alert(`Share link: ${response.data.shareLink}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate share link');
    }
  };

  const handleOpenDocument = (id) => {
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
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Documents
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username}
          </Typography>
          <IconButton color="inherit" onClick={onLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Documents</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              New Document
            </Button>
          </Box>

          {documents.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No documents yet. Create your first document!
            </Typography>
          ) : (
            <List>
              {documents.map((doc) => (
                <ListItem
                  key={doc._id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    mb: 1,
                    borderRadius: 1,
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  secondaryAction={
                    <Box>
                      <IconButton
                        edge="end"
                        onClick={() => handleShareDocument(doc._id)}
                        sx={{ mr: 1 }}
                      >
                        <ShareIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteDocument(doc._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={doc.title}
                    secondary={`Last saved: ${new Date(doc.lastSaved).toLocaleString()}`}
                    onClick={() => handleOpenDocument(doc._id)}
                    sx={{ cursor: 'pointer' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Container>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDocument} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;


