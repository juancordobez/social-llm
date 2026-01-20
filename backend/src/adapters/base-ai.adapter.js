/**
 * Social Mimic - Base AI Adapter
 * @description Abstract interface for AI/LLM providers
 * 
 * This adapter pattern allows switching between different AI providers
 * (Groq, OpenAI, Anthropic, etc.) without changing business logic.
 */

class BaseAIAdapter {
  constructor(config = {}) {
    if (new.target === BaseAIAdapter) {
      throw new Error('BaseAIAdapter is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = 'base';
  }

  /**
   * Generate text completion from a prompt
   * @param {string} prompt - The input prompt
   * @param {Object} options - Generation options
   * @param {string} options.model - Model to use
   * @param {number} options.maxTokens - Maximum tokens in response
   * @param {number} options.temperature - Creativity (0-1)
   * @param {string} options.systemPrompt - System context
   * @returns {Promise<{text: string, usage: Object, model: string}>}
   */
  async generateText(prompt, options = {}) {
    throw new Error('generateText() must be implemented by subclass');
  }

  /**
   * Generate chat completion from messages
   * @param {Array<{role: string, content: string}>} messages - Chat messages
   * @param {Object} options - Generation options
   * @returns {Promise<{text: string, usage: Object, model: string}>}
   */
  async chat(messages, options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Generate embeddings for text
   * @param {string|string[]} text - Text to embed
   * @returns {Promise<{embeddings: number[][], model: string}>}
   */
  async embed(text) {
    throw new Error('embed() must be implemented by subclass');
  }

  /**
   * Check if the adapter is properly configured and can connect
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Get available models for this provider
   * @returns {Promise<string[]>}
   */
  async listModels() {
    throw new Error('listModels() must be implemented by subclass');
  }
}

module.exports = { BaseAIAdapter };
