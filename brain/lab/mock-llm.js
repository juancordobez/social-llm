/**
 * Mock LLM - Simulador de respuestas LLM para testing
 * 
 * Permite probar estrategias sin consumir tokens reales.
 * Útil para:
 * - Desarrollo offline
 * - Tests automatizados
 * - Validar flujos antes de conectar a Groq
 */

/**
 * Respuestas predefinidas para diferentes tipos de análisis
 */
const MOCK_RESPONSES = {
  // Respuesta de análisis de personalidad
  analysis: {
    tone: {
      formality: 0.4,
      humor: 0.6,
      enthusiasm: 0.7,
      empathy: 0.5,
    },
    style: {
      verbosity: 0.5,
      complexity: 0.4,
      emojiUsage: 0.3,
      hashtagUsage: 0.2,
    },
    topics: ['tecnología', 'programación', 'startups'],
    vocabulary: {
      preferredWords: ['genial', 'interesante', 'mira'],
      catchphrases: ['a ver qué pasa', 'esto está bueno'],
    },
    confidence: 0.75,
    summary: 'Usuario casual, entusiasta de la tecnología, con tono amigable.',
  },

  // Respuesta de scoring
  scoring: {
    overall: 0.8,
    toneMatch: 0.75,
    styleMatch: 0.85,
    feedback: 'Buen match de estilo, podría ser más casual.',
  },
};

/**
 * Contenido generado mock según tipo
 */
const MOCK_CONTENT = {
  post: [
    '¡Esto de la IA está cada vez más interesante! 🚀',
    'Probando cosas nuevas, a ver qué sale...',
    'La tecnología avanza rápido, hay que mantenerse actualizado.',
  ],
  reply: [
    'Totalmente de acuerdo, muy buen punto!',
    'Interesante perspectiva, no lo había pensado así.',
    'Gracias por compartir! Me sirve mucho.',
  ],
  thread: [
    '1/ Hilo sobre algo que aprendí hoy...\n\n2/ Resulta que...\n\n3/ La conclusión es que vale la pena experimentar.',
  ],
};

/**
 * Cliente LLM Mock
 * Simula la interfaz de Groq/OpenAI
 */
class MockLLM {
  constructor(options = {}) {
    this.delay = options.delay || 100; // ms de delay simulado
    this.shouldFail = options.shouldFail || false;
    this.failRate = options.failRate || 0; // 0-1
    this.callCount = 0;
    this.history = [];
  }

  /**
   * Simula chat.completions.create
   */
  chat = {
    completions: {
      create: async (params) => {
        this.callCount++;
        
        // Simular delay de red
        await this._delay();

        // Simular fallos aleatorios
        if (this.shouldFail || Math.random() < this.failRate) {
          throw new Error('Mock LLM: Simulated failure');
        }

        // Guardar en historial
        this.history.push({
          timestamp: new Date(),
          params,
        });

        // Detectar tipo de request y responder apropiadamente
        const response = this._generateResponse(params);
        
        return {
          choices: [{
            message: {
              content: response,
              role: 'assistant',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        };
      },
    },
  };

  /**
   * Genera respuesta según el contexto del prompt
   */
  _generateResponse(params) {
    const systemPrompt = params.messages?.find(m => m.role === 'system')?.content || '';
    const userPrompt = params.messages?.find(m => m.role === 'user')?.content || '';
    const wantsJson = params.response_format?.type === 'json_object';

    // Detectar si es análisis de personalidad
    if (systemPrompt.includes('psycholinguistic') || userPrompt.includes('personality traits')) {
      return JSON.stringify(MOCK_RESPONSES.analysis);
    }

    // Detectar si es scoring
    if (systemPrompt.includes('authenticity') || userPrompt.includes('evaluate')) {
      return JSON.stringify(MOCK_RESPONSES.scoring);
    }

    // Detectar tipo de contenido a generar
    if (userPrompt.includes('reply') || userPrompt.includes('respuesta')) {
      return this._randomFrom(MOCK_CONTENT.reply);
    }

    if (userPrompt.includes('thread') || userPrompt.includes('hilo')) {
      return this._randomFrom(MOCK_CONTENT.thread);
    }

    // Default: post
    return this._randomFrom(MOCK_CONTENT.post);
  }

  _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  _delay() {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }

  /**
   * Obtener estadísticas del mock
   */
  getStats() {
    return {
      callCount: this.callCount,
      historyLength: this.history.length,
    };
  }

  /**
   * Resetear historial
   */
  reset() {
    this.callCount = 0;
    this.history = [];
  }

  /**
   * Agregar respuesta custom para testing específico
   */
  addCustomResponse(trigger, response) {
    // Permite agregar respuestas personalizadas
    this._customResponses = this._customResponses || {};
    this._customResponses[trigger] = response;
  }
}

/**
 * Factory function para crear mock LLM
 */
function createMockLLM(options = {}) {
  return new MockLLM(options);
}

module.exports = {
  MockLLM,
  createMockLLM,
  MOCK_RESPONSES,
  MOCK_CONTENT,
};
