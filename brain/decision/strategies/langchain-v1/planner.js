/**
 * Planner - Planifica cómo responder
 * 
 * Una vez que el Evaluator decide responder,
 * el Planner define la estrategia de respuesta.
 * 
 * @usage
 * const planner = new Planner(model);
 * const plan = await planner.createPlan(message, evaluation, context);
 */

const { plannerPrompt } = require('./prompts');
const { ResponsePlanSchema, parseAndValidate } = require('./schemas');

class Planner {
  /**
   * @param {BaseChatModel} model - Modelo LangChain
   * @param {Object} options - Opciones
   */
  constructor(model, options = {}) {
    this.model = model;
    this.chain = plannerPrompt.pipe(model);
    
    // Personalidad por defecto
    this.defaultPersonality = options.personality || {
      tone: {
        formality: 0.4,
        humor: 0.6,
        enthusiasm: 0.7,
        empathy: 0.8,
      },
      style: {
        verbosity: 0.4,
        emojiUsage: 0.3,
      },
    };
  }

  /**
   * Crea un plan de respuesta
   * 
   * @param {Object} message - Mensaje original
   * @param {Object} evaluation - Resultado del Evaluator
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Plan de respuesta
   */
  async createPlan(message, evaluation, context = {}) {
    const { author, content } = message;
    const { memoryContext = '', personalityTraits } = context;

    console.log(`[Planner] Creando plan para respuesta a @${author}`);

    try {
      // Formatear traits de personalidad para el prompt
      const traitsText = this._formatPersonalityTraits(
        personalityTraits || this.defaultPersonality
      );

      // Invocar el chain
      const response = await this.chain.invoke({
        personalityTraits: traitsText,
        author,
        content,
        evaluation: JSON.stringify(evaluation),
        memoryContext: memoryContext || 'Sin contexto de conversaciones previas',
      });

      // Parsear y validar
      const plan = parseAndValidate(response.content, ResponsePlanSchema);

      console.log(`[Planner] Plan: ${plan.strategy} / ${plan.tone} / ${plan.length}`);

      return plan;

    } catch (error) {
      console.error('[Planner] Error:', error.message);
      
      // Plan de emergencia
      return this._fallbackPlan(evaluation);
    }
  }

  /**
   * Formatea los traits de personalidad para el prompt
   * @private
   */
  _formatPersonalityTraits(traits) {
    const lines = [];
    
    if (traits.tone) {
      lines.push('TONO:');
      if (traits.tone.formality !== undefined) {
        lines.push(`- Formalidad: ${traits.tone.formality < 0.5 ? 'Casual' : 'Formal'}`);
      }
      if (traits.tone.humor !== undefined) {
        lines.push(`- Humor: ${traits.tone.humor > 0.5 ? 'Sí, usar humor' : 'Poco humor'}`);
      }
      if (traits.tone.enthusiasm !== undefined) {
        lines.push(`- Entusiasmo: ${traits.tone.enthusiasm > 0.6 ? 'Alto' : 'Moderado'}`);
      }
      if (traits.tone.empathy !== undefined) {
        lines.push(`- Empatía: ${traits.tone.empathy > 0.6 ? 'Muy empático' : 'Neutral'}`);
      }
    }
    
    if (traits.style) {
      lines.push('ESTILO:');
      if (traits.style.verbosity !== undefined) {
        lines.push(`- Verbosidad: ${traits.style.verbosity < 0.5 ? 'Conciso' : 'Detallado'}`);
      }
      if (traits.style.emojiUsage !== undefined) {
        lines.push(`- Emojis: ${traits.style.emojiUsage > 0.5 ? 'Usar emojis' : 'Pocos emojis'}`);
      }
    }

    if (traits.topics) {
      lines.push(`TEMAS FAVORITOS: ${traits.topics.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Plan de emergencia cuando el LLM falla
   * @private
   */
  _fallbackPlan(evaluation) {
    // Plan básico basado en la categoría
    const plans = {
      question: {
        tone: 'helpful',
        length: 'medium',
        includeEmoji: false,
        includeQuestion: false,
        strategy: 'answer',
      },
      conversation: {
        tone: 'friendly',
        length: 'short',
        includeEmoji: true,
        includeQuestion: true,
        strategy: 'engage',
      },
      mention: {
        tone: 'casual',
        length: 'short',
        includeEmoji: true,
        includeQuestion: false,
        strategy: 'engage',
      },
    };

    return plans[evaluation.category] || plans.mention;
  }

  /**
   * Ajusta el plan basado en restricciones
   * 
   * @param {Object} plan - Plan original
   * @param {Object} constraints - Restricciones
   * @returns {Object} Plan ajustado
   */
  adjustPlan(plan, constraints = {}) {
    const adjusted = { ...plan };

    // Forzar longitud corta si hay rate limit
    if (constraints.lowTokenBudget) {
      adjusted.length = 'short';
      adjusted.includeQuestion = false;
    }

    // Quitar emojis si la plataforma no los soporta bien
    if (constraints.noEmoji) {
      adjusted.includeEmoji = false;
    }

    // Forzar tono profesional si es tema serio
    if (constraints.seriousTopic) {
      adjusted.tone = 'professional';
      adjusted.includeEmoji = false;
    }

    return adjusted;
  }
}

module.exports = { Planner };
