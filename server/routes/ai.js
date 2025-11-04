const express = require('express');
const geminiService = require('../services/gemini');
const { authMiddleware } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Test API connection and list available models
router.get('/test', authMiddleware, async (req, res) => {
  try {
    const geminiService = require('../services/gemini');
    
    // Try to list available models
    const availableModels = await geminiService.listAvailableModels();
    
    // Also try to make a test request to verify API key works
    let testResult = null;
    let testError = null;
    try {
      testResult = await geminiService.generateResponse('Say "test"');
    } catch (error) {
      testError = error.message;
    }
    
    res.json({ 
      success: testResult !== null,
      availableModels,
      testResult: testResult ? 'API key is valid!' : null,
      testError,
      message: testResult 
        ? `API key is valid! Available models: ${availableModels.length > 0 ? availableModels.join(', ') : 'Using fallback detection'}`
        : `API key test failed: ${testError || 'Unknown error'}`
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to test API connection'
    });
  }
});

const validateAIRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Grammar check
router.post('/grammar-check', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const result = await geminiService.checkGrammar(text);
    res.json({ result });
  } catch (error) {
    console.error('Grammar check error:', error);
    res.status(500).json({ error: error.message || 'Failed to check grammar' });
  }
});

// Enhance text
router.post('/enhance', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const result = await geminiService.enhanceText(text);
    res.json({ result });
  } catch (error) {
    console.error('Enhance error:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance text' });
  }
});

// Summarize text
router.post('/summarize', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const result = await geminiService.summarizeText(text);
    res.json({ result });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize text' });
  }
});

// Auto-complete text
router.post('/complete', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const result = await geminiService.completeText(text, context || '');
    res.json({ result });
  } catch (error) {
    console.error('Complete error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete text' });
  }
});

// Get suggestions
router.post('/suggestions', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req, res) => {
  try {
    const { text, type } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const result = await geminiService.getSuggestions(text, type || 'general');
    res.json({ result });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get suggestions' });
  }
});

module.exports = router;

