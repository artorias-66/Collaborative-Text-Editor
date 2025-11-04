const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. AI features will not work.');
      this.genAI = null;
      this.model = null;
      this.modelName = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Allow model to be configured via env var, default to gemini-pro (most compatible)
      const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
      this.model = this.genAI.getGenerativeModel({ model: modelName });
      this.modelName = modelName;
      this.lastError = null;
      console.log(`Using Gemini model: ${modelName}`);
    }
  }

  async listAvailableModels() {
    if (!this.genAI || !process.env.GEMINI_API_KEY) return [];

    try {
      // Try direct HTTP call to list models
      const https = require('https');
      const apiKey = process.env.GEMINI_API_KEY;
      
      return new Promise((resolve, reject) => {
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        
        https.get(url, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.models && Array.isArray(response.models)) {
                const modelNames = response.models
                  .map(model => model.name?.replace('models/', '') || model.name)
                  .filter(name => name);
                console.log('📋 Found models via API:', modelNames);
                resolve(modelNames);
              } else if (response.error) {
                console.error('API Error:', response.error.message);
                resolve([]);
              } else {
                resolve([]);
              }
            } catch (error) {
              console.error('Error parsing models response:', error.message);
              resolve([]);
            }
          });
        }).on('error', (error) => {
          console.error('Error fetching models:', error.message);
          resolve([]);
        });
      });
    } catch (error) {
      console.error('Error listing models:', error.message);
      return [];
    }
  }

  async findWorkingModel() {
    if (!this.genAI) return null;

    console.log('📋 Fetching available models from API...');
    const availableModels = await this.listAvailableModels();
    
    if (availableModels.length > 0) {
      console.log('✅ Available models:', availableModels);
      
      // Try the available models first
      for (const modelName of availableModels) {
        try {
          // Extract just the model name (remove 'models/' prefix if present)
          const cleanName = modelName.replace('models/', '');
          const testModel = this.genAI.getGenerativeModel({ model: cleanName });
          // Make a minimal test request
          const testResult = await testModel.generateContent('test');
          await testResult.response;
          
          // If we get here, this model works!
          console.log(`✅ Found working model: ${cleanName}`);
          this.model = testModel;
          this.modelName = cleanName;
          return cleanName;
        } catch (error) {
          console.log(`❌ Model ${modelName} failed: ${error.message?.split('\n')[0]}`);
          continue;
        }
      }
    }

    // Fallback: Try common model names if API listing didn't work
    const modelsToTry = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-1.5-pro-latest'
    ];

    console.log('📋 Trying fallback models...');
    for (const modelName of modelsToTry) {
      try {
        const testModel = this.genAI.getGenerativeModel({ model: modelName });
        // Make a minimal test request
        const testResult = await testModel.generateContent('test');
        await testResult.response;
        
        // If we get here, this model works!
        console.log(`✅ Found working model: ${modelName}`);
        this.model = testModel;
        this.modelName = modelName;
        return modelName;
      } catch (error) {
        console.log(`❌ Model ${modelName} failed: ${error.message?.split('\n')[0]}`);
        continue;
      }
    }

    return null;
  }

  async generateResponse(prompt) {
    try {
      if (!this.model) {
        throw new Error('AI service is not configured. Please check API key.');
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error.message);
      this.lastError = error;
      
      // If it's a 404/model not found error, try to find a working model
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.log('🔄 Model not found, attempting to find working model...');
        const workingModel = await this.findWorkingModel();
        
        if (workingModel) {
          // Retry with the working model
          console.log(`🔄 Retrying with model: ${workingModel}`);
          try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          } catch (retryError) {
            throw new Error(`AI model error: ${retryError.message}`);
          }
        } else {
          // None of the models worked
          const modelsToTry = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-1.5-pro-latest'];
          throw new Error(`No working Gemini model found. Please verify your API key is valid and has access to Gemini models. Common issues:\n` +
            `1. API key may be invalid or expired\n` +
            `2. Generative Language API may not be enabled in Google Cloud Console\n` +
            `3. API key may not have proper permissions\n` +
            `4. Your API key may be for a different service (e.g., Vertex AI instead of Google AI Studio)\n\n` +
            `Tried models: ${modelsToTry.join(', ')}`);
        }
      }
      
      // Provide more specific error messages
      if (error.message?.includes('API key') || error.message?.includes('not configured')) {
        throw new Error('AI service configuration error. Please check API key.');
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      } else if (error.message?.includes('safety')) {
        throw new Error('Content blocked by safety filters. Please try different text.');
      } else {
        throw new Error(error.message || 'AI service temporarily unavailable. Please try again.');
      }
    }
  }

  async checkGrammar(text) {
    const prompt = `Review the following text for grammar, spelling, and style errors. Provide corrections and suggestions in a clear format. Return only the corrected text and brief explanations for significant changes:\n\n${text}`;
    return await this.generateResponse(prompt);
  }

  async enhanceText(text) {
    const prompt = `Improve the following text for clarity, tone, and readability while maintaining its original meaning. Provide the enhanced version:\n\n${text}`;
    return await this.generateResponse(prompt);
  }

  async summarizeText(text) {
    const prompt = `Summarize the following text concisely, capturing the main points and key information:\n\n${text}`;
    return await this.generateResponse(prompt);
  }

  async completeText(text, context = '') {
    const prompt = `Complete the following text naturally and contextually. Continue from where it left off:\n\n${context}\n\n${text}`;
    return await this.generateResponse(prompt);
  }

  async getSuggestions(text, type = 'general') {
    const prompts = {
      general: `Provide writing suggestions to improve the following text:\n\n${text}`,
      creative: `Provide creative writing suggestions for the following text:\n\n${text}`,
      professional: `Provide professional writing suggestions for the following text:\n\n${text}`
    };

    const prompt = prompts[type] || prompts.general;
    return await this.generateResponse(prompt);
  }
}

module.exports = new GeminiService();

