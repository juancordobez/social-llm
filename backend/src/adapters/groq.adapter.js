/**
 * Social Mimic - Groq AI Adapter
 * @description Implementation for Groq API (Llama 3.1 70B - FREE)
 * 
 * Groq provides fast inference for open-source models.
 * Free tier: 30 req/min, 6000 req/day
 * 
 * @see https://console.groq.com/docs/quickstart
 */

const { BaseAIAdapter } = require('./base-ai.adapter');

class GroqAdapter extends BaseAIAdapter {
  constructor(config = {}) {
    super(config);
    this.name = 'groq';
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
    this.defaultModel = config.model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
    
    if (!this.apiKey) {
      console.warn('[GroqAdapter] Warning: GROQ_API_KEY not configured');
    }
  }

  /**
   * Make HTTP request to Groq API
   * @private
   */
  async _request(endpoint, body) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Groq API Error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate text completion from a prompt
   */
  async generateText(prompt, options = {}) {
    const messages = [
      ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
      { role: 'user', content: prompt }
    ];

    return this.chat(messages, options);
  }

  /**
   * Generate chat completion from messages
   */
  async chat(messages, options = {}) {
    const {
      model = this.defaultModel,
      maxTokens = 1024,
      temperature = 0.7,
      topP = 1,
      stop = null,
    } = options;

    const response = await this._request('/chat/completions', {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      stop,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      finishReason: response.choices[0]?.finish_reason,
    };
  }

  /**
   * Generate embeddings - Note: Groq doesn't support embeddings yet
   * We'll use a fallback or throw an error
   */
  async embed(text) {
    // Groq doesn't have embedding models yet
    // For embeddings, we'll use Supabase's built-in or a free alternative
    throw new Error('Groq does not support embeddings. Use SupabaseAdapter for vector embeddings.');
  }

  /**
   * Check if Groq API is accessible
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return { ok: false, message: 'GROQ_API_KEY not configured' };
      }

      // Simple test with minimal tokens
      const result = await this.chat(
        [{ role: 'user', content: 'Hi' }],
        { maxTokens: 5 }
      );

      return {
        ok: true,
        message: `Groq connected successfully. Model: ${result.model}`,
        model: result.model,
      };
    } catch (error) {
      return {
        ok: false,
        message: `Groq health check failed: ${error.message}`,
      };
    }
  }

  /**
   * List available Groq models
   */
  async listModels() {
    // Groq's available models (as of 2026)
    return [
      'llama-3.1-70b-versatile',   // Best for complex tasks
      'llama-3.1-8b-instant',      // Fast, good for simple tasks
      'llama-3.2-90b-vision',      // Multimodal
      'mixtral-8x7b-32768',        // Good context length
      'gemma2-9b-it',              // Google's model
    ];
  }

  /**
   * Generate content with personality context
   * @param {Object} personality - User personality profile
   * @param {string} topic - Content topic
   * @param {string} platform - Target platform (twitter, linkedin, etc.)
   */
  async generateSocialContent(personality, topic, platform) {
    const systemPrompt = this._buildPersonalityPrompt(personality, platform);
    
    const prompt = `Generate a ${platform} post about: ${topic}

Requirements:
- Match the personality and tone described
- Be authentic and engaging
- Include relevant hashtags if appropriate
- Respect platform character limits`;

    const result = await this.generateText(prompt, {
      systemPrompt,
      temperature: 0.8, // More creative for social content
      maxTokens: 500,
    });

    return {
      content: result.text,
      platform,
      topic,
      model: result.model,
      usage: result.usage,
    };
  }

  /**
   * Build personality-based system prompt
   * @private
   */
  _buildPersonalityPrompt(personality, platform) {
    const { tone, style, topics, vocabulary, quirks } = personality || {};

    return `You are a social media content creator with the following personality:

TONE: ${tone || 'professional yet approachable'}
WRITING STYLE: ${style || 'clear, concise, and engaging'}
EXPERTISE TOPICS: ${topics?.join(', ') || 'technology, innovation'}
VOCABULARY PREFERENCE: ${vocabulary || 'accessible technical language'}
UNIQUE QUIRKS: ${quirks?.join(', ') || 'uses analogies, asks thought-provoking questions'}

PLATFORM: ${platform}
${platform === 'twitter' ? 'Keep it under 280 characters. Be punchy and engaging.' : ''}
${platform === 'linkedin' ? 'Be professional but personable. Can be longer form.' : ''}
${platform === 'instagram' ? 'Focus on visual description and emotional connection.' : ''}

Always write as if you ARE this person, not describing them.`;
  }

  /**
   * Analyze text to extract personality traits
   * @param {string[]} samples - Sample texts from the user
   */
  async analyzePersonality(samples) {
    const prompt = `Analyze the following text samples and extract the author's personality traits for social media content creation:

SAMPLES:
${samples.map((s, i) => `[${i + 1}] ${s}`).join('\n\n')}

Respond in JSON format:
{
  "tone": "description of their typical tone",
  "style": "their writing style characteristics",
  "topics": ["main", "interest", "areas"],
  "vocabulary": "vocabulary level and preferences",
  "quirks": ["unique", "writing", "quirks"],
  "confidence": 0.0-1.0
}`;

    const result = await this.generateText(prompt, {
      systemPrompt: 'You are an expert linguistic analyst. Respond only with valid JSON.',
      temperature: 0.3, // More deterministic for analysis
      maxTokens: 500,
    });

    try {
      // Extract JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON in response');
    } catch (error) {
      console.error('[GroqAdapter] Failed to parse personality analysis:', error);
      return {
        tone: 'professional',
        style: 'clear and concise',
        topics: ['general'],
        vocabulary: 'standard',
        quirks: [],
        confidence: 0.5,
        _raw: result.text,
      };
    }
  }
}

module.exports = { GroqAdapter };
