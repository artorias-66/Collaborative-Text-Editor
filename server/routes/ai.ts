import express, { Request, Response, NextFunction } from 'express';
import geminiService from '../services/gemini';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Helper for SSE streaming
const handleStreamResponse = async (res: Response, promptGenerator: () => Promise<any>) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await promptGenerator();

    for await (const chunk of stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

// Test API connection
router.get('/test', authMiddleware, async (req: Request, res: Response) => {
  try {
    let testResult: string | null = null;
    let testError = null;
    try {
      testResult = await geminiService.generateResponse('Say "test"');
    } catch (error: any) {
      testError = error.message;
    }

    res.json({
      status: testResult ? 'success' : 'error',
      models: [], // listAvailableModels no longer available
      testResponse: testResult,
      testError
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to test API connection' });
  }
});

const validateAIRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Grammar check
router.post('/grammar-check', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req: Request, res: Response) => {
  try {
    const { text, stream } = req.body;

    if (stream) {
      const prompt = `You are a grammar checker. Return ONLY the corrected text. Do NOT add any explanations, notes, bullet points, or commentary. Just output the fixed text and nothing else:\n\n${text}`;
      await handleStreamResponse(res, () => geminiService.generateStream(prompt));
    } else {
      const result = await geminiService.checkGrammar(text);
      res.json({ result });
    }
  } catch (error: any) {
    console.error('Grammar check error:', error);
    res.status(500).json({ error: error.message || 'Failed to check grammar' });
  }
});

// Enhance text
router.post('/enhance', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req: Request, res: Response) => {
  try {
    const { text, stream } = req.body;

    if (stream) {
      const prompt = `You are a text enhancer. Return ONLY the improved text. Do NOT add any explanations, notes, bullet points, or commentary. Just output the enhanced text and nothing else:\n\n${text}`;
      await handleStreamResponse(res, () => geminiService.generateStream(prompt));
    } else {
      const result = await geminiService.enhanceText(text);
      res.json({ result });
    }
  } catch (error: any) {
    console.error('Enhance error:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance text' });
  }
});

// Summarize text
router.post('/summarize', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req: Request, res: Response) => {
  try {
    const { text, stream } = req.body;

    if (stream) {
      const prompt = `Summarize the following text. Return ONLY the summary. Do NOT add any explanations, notes, bullet points, or commentary. Just output the summary and nothing else:\n\n${text}`;
      await handleStreamResponse(res, () => geminiService.generateStream(prompt));
    } else {
      const result = await geminiService.summarizeText(text);
      res.json({ result });
    }
  } catch (error: any) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize text' });
  }
});

// Auto-complete text
router.post('/complete', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req: Request, res: Response) => {
  try {
    const { text, context, stream } = req.body;

    if (stream) {
      const prompt = `Complete the following text naturally. Return ONLY the completed text. Do NOT add any explanations, notes, bullet points, or commentary:\n\n${context || ''}\n\n${text}`;
      await handleStreamResponse(res, () => geminiService.generateStream(prompt));
    } else {
      const result = await geminiService.completeText(text, context || '');
      res.json({ result });
    }
  } catch (error: any) {
    console.error('Complete error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete text' });
  }
});

// Get suggestions
router.post('/suggestions', authMiddleware, aiLimiter, [
  body('text').notEmpty().withMessage('Text is required')
], validateAIRequest, async (req: Request, res: Response) => {
  try {
    const { text, type, stream } = req.body;

    if (stream) {
      const prompts = {
        general: `Improve the following text. Return ONLY the improved text, nothing else:\n\n${text}`,
        creative: `Rewrite the following text creatively. Return ONLY the creative text, nothing else:\n\n${text}`,
        professional: `Rewrite the following text professionally. Return ONLY the professional text, nothing else:\n\n${text}`
      };
      const prompt = prompts[type as keyof typeof prompts] || prompts.general;
      await handleStreamResponse(res, () => geminiService.generateStream(prompt));
    } else {
      const result = await geminiService.getSuggestions(text, type || 'general');
      res.json({ result });
    }
  } catch (error: any) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get suggestions' });
  }
});

export default router;

