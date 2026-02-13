import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import https from 'https';

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  public modelName: string | null = null;
  public lastError: Error | null = null;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. AI features will not work.');
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Default to gemini-2.0-flash but we will rotate on error
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      this.model = this.genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
      this.modelName = modelName;
      console.log(`Using Gemini model: ${modelName}`);
    }
  }

  // List of models to try in order of preference
  private fallbackModels = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-pro-latest',
    'gemini-exp-1206'
  ];

  async generateResponse(prompt: string, retryCount = 0): Promise<string> {
    try {
      if (!this.model) {
        throw new Error('AI service is not configured. Please check API key.');
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error(`Gemini API error (model: ${this.modelName}):`, error.message);
      this.lastError = error;

      // Handle Rate Limits (429) or Not Found (404) by rotating models
      if (
        (error.message?.includes('429') || error.message?.includes('404') || error.message?.includes('quota')) &&
        retryCount < this.fallbackModels.length
      ) {
        console.log(`🔄 Quota exceeded or model not found. Rotating to next model...`);

        // Find current model index
        const currentIndex = this.fallbackModels.indexOf(this.modelName || '');
        const nextIndex = (currentIndex + 1) % this.fallbackModels.length;
        const nextModelName = this.fallbackModels[nextIndex];

        console.log(`🔄 Switching to model: ${nextModelName}`);
        this.modelName = nextModelName;
        this.model = this.genAI!.getGenerativeModel({ model: nextModelName }, { apiVersion: 'v1beta' });

        // Retry with new model
        return this.generateResponse(prompt, retryCount + 1);
      }

      throw error;
    }
  }

  async generateStream(prompt: string, retryCount = 0): Promise<any> {
    if (!this.model) {
      throw new Error('AI service is not configured. Please check API key.');
    }

    try {
      const result = await this.model.generateContentStream(prompt);
      return result.stream;
    } catch (error: any) {
      console.error(`Gemini Stream Error (model: ${this.modelName}):`, error.message);

      // Handle Rate Limits (429) or Not Found (404) by rotating models
      if (
        (error.message?.includes('429') || error.message?.includes('404') || error.message?.includes('quota')) &&
        retryCount < this.fallbackModels.length
      ) {
        console.log(`🔄 Stream Quota exceeded/Error. Rotating to next model...`);

        // Find current model index
        const currentIndex = this.fallbackModels.indexOf(this.modelName || '');
        const nextIndex = (currentIndex + 1) % this.fallbackModels.length;
        const nextModelName = this.fallbackModels[nextIndex];

        console.log(`🔄 Switching to model: ${nextModelName}`);
        this.modelName = nextModelName;
        this.model = this.genAI!.getGenerativeModel({ model: nextModelName }, { apiVersion: 'v1beta' });

        // Retry with new model
        return this.generateStream(prompt, retryCount + 1);
      }

      throw error;
    }
  }

  // ... rest of methods use generateResponse

  // Helper to strip explanations from AI responses
  private stripExplanations(text: string): string {
    let cleaned = text.trim();


    // Strategy: Find where explanations start and cut everything after that point

    // Look for common explanation markers and cut everything from that point
    const cutoffMarkers = [
      /\*\*Brief/i,           // **Brief Explanations
      /\*\*Explanation/i,     // **Explanation or **Explanations
      /\*\*Changes/i,         // **Changes
      /\*\*Note/i,            // **Note
      /\n\s*\*\s+\*\*/,        // Bullet points with bold text
      /\n\s*-\s+\*\*/,         // Dash bullets with bold text
      /\n\s*---/,             // Separator lines
    ];

    for (const marker of cutoffMarkers) {
      const match = cleaned.match(marker);
      if (match && match.index !== undefined) {
        cleaned = cleaned.substring(0, match.index);
        break;
      }
    }

    // Remove any remaining asterisks or bold markers
    cleaned = cleaned.replace(/\*\*/g, '');

    // Final cleanup: if there are still lines with bullets, remove them
    const lines = cleaned.split('\n');
    const cleanLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Stop if we hit a line that looks like an explanation (starts with * or -)
      if (trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
        break;
      }
      cleanLines.push(line);
    }

    cleaned = cleanLines.join('\n').trim();


    return cleaned;
  }

  async checkGrammar(text: string): Promise<string> {
    const prompt = `You are a grammar checker. Your ONLY job is to return the corrected text.

CRITICAL RULES:
- Return ONLY the corrected text
- Do NOT add explanations
- Do NOT add notes or commentary
- Do NOT use asterisks, bullets, or formatting
- Do NOT add "Explanation:" or similar sections

Text to correct:
${text}`;
    const result = await this.generateResponse(prompt);
    return this.stripExplanations(result);
  }

  async enhanceText(text: string): Promise<string> {
    const prompt = `You are a text enhancer. Your ONLY job is to return the improved text.

CRITICAL RULES:
- Return ONLY the enhanced text
- Do NOT add explanations
- Do NOT add notes or commentary
- Do NOT use asterisks, bullets, or formatting
- Do NOT add "Explanation:" or similar sections

Text to enhance:
${text}`;
    const result = await this.generateResponse(prompt);
    return this.stripExplanations(result);
  }

  async summarizeText(text: string): Promise<string> {
    const prompt = `You are a summarizer. Your ONLY job is to return the summary.

CRITICAL RULES:
- Return ONLY the summary
- Do NOT add explanations
- Do NOT add notes or commentary
- Do NOT use asterisks, bullets, or formatting

Text to summarize:
${text}`;
    const result = await this.generateResponse(prompt);
    return this.stripExplanations(result);
  }

  async completeText(text: string, context: string = ''): Promise<string> {
    const prompt = `Complete the text naturally. Return ONLY the completed text, nothing else.\n\nContext: ${context}\nText: ${text}`;
    const result = await this.generateResponse(prompt);
    return this.stripExplanations(result);
  }

  async getSuggestions(text: string, type: 'general' | 'creative' | 'professional' = 'general'): Promise<string> {
    const prompts = {
      general: `Provide an improved version of the text. Return ONLY the improved text, nothing else.\n\nText:\n${text}`,
      creative: `Provide a creative version of the text. Return ONLY the creative text, nothing else.\n\nText:\n${text}`,
      professional: `Make the text professional. Return ONLY the professional version, nothing else.\n\nText:\n${text}`
    };

    const prompt = prompts[type] || prompts.general;
    const result = await this.generateResponse(prompt);
    return this.stripExplanations(result);
  }
}

export default new GeminiService();

