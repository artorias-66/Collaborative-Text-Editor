const express = require('express');
const Document = require('../models/Document');
const { authMiddleware } = require('../middleware/auth');
const { documentValidation } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Get all user's documents
router.get('/', authMiddleware, apiLimiter, async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user.userId },
        { 'permissions.user': req.user.userId }
      ]
    })
    .populate('owner', 'username email')
    .sort({ updatedAt: -1 })
    .select('-content'); // Don't send full content in list

    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new document
router.post('/', authMiddleware, apiLimiter, documentValidation, async (req, res) => {
  try {
    const { title, content } = req.body;

    const document = new Document({
      title: title || 'Untitled Document',
      content: content || '',
      owner: req.user.userId,
      permissions: [{
        user: req.user.userId,
        role: 'owner'
      }]
    });

    await document.save();

    res.status(201).json({ document });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific document
router.get('/:id', authMiddleware, apiLimiter, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'username email')
      .populate('permissions.user', 'username email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (!document.hasPermission(req.user.userId, 'viewer')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update document
router.put('/:id', authMiddleware, apiLimiter, documentValidation, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    if (!document.hasPermission(req.user.userId, 'editor')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.body.title !== undefined) {
      document.title = req.body.title;
    }
    if (req.body.content !== undefined) {
      document.content = req.body.content;
    }
    document.lastSaved = new Date();

    await document.save();

    res.json({ document });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete document
router.delete('/:id', authMiddleware, apiLimiter, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can delete
    if (document.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can delete document' });
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate share link
router.post('/:id/share', authMiddleware, apiLimiter, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner can generate share link
    if (document.owner.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can generate share link' });
    }

    const shareLink = document.generateShareLink();
    await document.save();

    res.json({ shareLink: `${process.env.CLIENT_URL}/document/${shareLink}` });
  } catch (error) {
    console.error('Share link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get document by share link
router.get('/share/:shareLink', async (req, res) => {
  try {
    const document = await Document.findOne({ shareLink: req.params.shareLink })
      .populate('owner', 'username email');

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Get shared document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

