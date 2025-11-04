const Document = require('../models/Document');
const jwt = require('jsonwebtoken');

const socketHandler = (socket, io) => {
  console.log(`User connected: ${socket.userId}`);

  // Join document room
  socket.on('join-document', async (documentId) => {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      // Check permissions
      if (!document.hasPermission(socket.userId, 'viewer')) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(`document:${documentId}`);
      
      // Notify others in the room
      socket.to(`document:${documentId}`).emit('user-joined', {
        userId: socket.userId,
        timestamp: new Date()
      });

      // Send current document state
      socket.emit('document-loaded', {
        content: document.content,
        title: document.title
      });

      console.log(`User ${socket.userId} joined document ${documentId}`);
    } catch (error) {
      console.error('Join document error:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Leave document room
  socket.on('leave-document', (documentId) => {
    socket.leave(`document:${documentId}`);
    socket.to(`document:${documentId}`).emit('user-left', {
      userId: socket.userId,
      timestamp: new Date()
    });
    console.log(`User ${socket.userId} left document ${documentId}`);
  });

  // Handle text changes
  socket.on('text-change', async (data) => {
    try {
      const { documentId, delta, content } = data;

      // Verify user has access
      const document = await Document.findById(documentId);
      if (!document || !document.hasPermission(socket.userId, 'editor')) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Broadcast change to other users in the room
      socket.to(`document:${documentId}`).emit('text-change', {
        userId: socket.userId,
        delta,
        content,
        timestamp: new Date()
      });

      // Note: Auto-save is handled on client side with debouncing
      // This is just for real-time sync, not persistent saving
    } catch (error) {
      console.error('Text change error:', error);
      socket.emit('error', { message: 'Failed to update document' });
    }
  });

  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    const { documentId, range } = data;
    socket.to(`document:${documentId}`).emit('cursor-move', {
      userId: socket.userId,
      range,
      timestamp: new Date()
    });
  });

  // Handle manual save
  socket.on('save-document', async (data) => {
    try {
      const { documentId, content, title } = data;

      const document = await Document.findById(documentId);
      if (!document || !document.hasPermission(socket.userId, 'editor')) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      if (content !== undefined) document.content = content;
      if (title !== undefined) document.title = title;
      document.lastSaved = new Date();

      await document.save();

      socket.emit('document-saved', {
        success: true,
        timestamp: document.lastSaved
      });

      // Notify others
      socket.to(`document:${documentId}`).emit('document-saved', {
        success: true,
        timestamp: document.lastSaved
      });
    } catch (error) {
      console.error('Save document error:', error);
      socket.emit('error', { message: 'Failed to save document' });
    }
  });

  // Handle AI analysis request
  socket.on('ai-analyze-text', async (data) => {
    try {
      const { documentId, text, type } = data;

      // Emit processing status
      socket.emit('ai-processing', { status: 'processing' });

      const geminiService = require('../services/gemini');
      let result;

      switch (type) {
        case 'grammar':
          result = await geminiService.checkGrammar(text);
          break;
        case 'enhance':
          result = await geminiService.enhanceText(text);
          break;
        case 'summarize':
          result = await geminiService.summarizeText(text);
          break;
        default:
          result = await geminiService.getSuggestions(text);
      }

      socket.emit('ai-suggestions-ready', {
        type,
        result,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      socket.emit('ai-error', { message: error.message || 'AI service error' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
};

module.exports = socketHandler;

