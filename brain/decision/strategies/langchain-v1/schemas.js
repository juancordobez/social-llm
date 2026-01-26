/**
 * Zod Schemas para validar respuestas del LLM
 * 
 * Garantiza que las respuestas del LLM tengan el formato correcto.
 */

const { z } = require('zod');

/**
 * Schema para la evaluación (¿debo responder?)
 */
const EvaluationSchema = z.object({
  shouldRespond: z.boolean().describe('Si el bot debe responder'),
  confidence: z.number().min(0).max(1).describe('Confianza en la decisión (0-1)'),
  reason: z.string().describe('Explicación de la decisión'),
  priority: z.number().min(0).max(1).describe('Urgencia/importancia (0-1)'),
  category: z.enum([
    'question',
    'conversation', 
    'mention',
    'spam',
    'offtopic',
    'toxic'
  ]).describe('Categoría del mensaje'),
});

/**
 * Schema para el plan de respuesta
 */
const ResponsePlanSchema = z.object({
  tone: z.enum([
    'friendly',
    'professional',
    'casual',
    'helpful',
    'witty'
  ]).describe('Tono de la respuesta'),
  
  length: z.enum([
    'short',
    'medium',
    'long'
  ]).describe('Longitud deseada'),
  
  includeEmoji: z.boolean().describe('Si incluir emojis'),
  includeQuestion: z.boolean().describe('Si incluir pregunta de seguimiento'),
  
  strategy: z.enum([
    'answer',
    'opinion',
    'joke',
    'redirect',
    'engage',
    'inform'
  ]).describe('Estrategia de respuesta'),
  
  keyPoints: z.array(z.string()).optional().describe('Puntos clave a incluir'),
  avoidTopics: z.array(z.string()).optional().describe('Temas a evitar'),
  suggestedOpening: z.string().optional().describe('Sugerencia de apertura'),
});

/**
 * Schema para clasificación de contenido
 */
const ContentClassificationSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  intent: z.enum(['question', 'statement', 'request', 'complaint', 'praise', 'other']),
  topics: z.array(z.string()),
  urgency: z.enum(['high', 'medium', 'low']),
  language: z.enum(['es', 'en', 'other']),
});

/**
 * Schema para decisión final del DecisionMaker
 */
const DecisionSchema = z.object({
  action: z.enum([
    'respond',      // Responder al mensaje
    'ignore',       // Ignorar
    'queue',        // Poner en cola para después
    'escalate',     // Requiere atención humana
  ]).describe('Acción a tomar'),
  
  evaluation: EvaluationSchema.optional(),
  plan: ResponsePlanSchema.optional(),
  
  timing: z.object({
    delay: z.number().describe('Delay en ms antes de responder'),
    reason: z.string().describe('Razón del timing'),
  }).optional(),
  
  metadata: z.object({
    processedAt: z.string(),
    modelUsed: z.string().optional(),
    tokensUsed: z.number().optional(),
  }).optional(),
});

/**
 * Parsea JSON de respuesta del LLM de forma segura
 * 
 * @param {string} text - Respuesta del LLM
 * @param {z.ZodSchema} schema - Schema para validar
 * @returns {Object} Objeto parseado y validado
 */
function parseAndValidate(text, schema) {
  try {
    // Extraer JSON del texto (por si viene con texto adicional)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON en la respuesta');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Schemas] Validación fallida:', error.errors);
      throw new Error(`Respuesta del LLM no válida: ${error.errors[0].message}`);
    }
    throw error;
  }
}

/**
 * Crea un schema parcial (todos los campos opcionales)
 * Útil para respuestas incompletas del LLM
 */
function makePartial(schema) {
  return schema.partial();
}

module.exports = {
  EvaluationSchema,
  ResponsePlanSchema,
  ContentClassificationSchema,
  DecisionSchema,
  parseAndValidate,
  makePartial,
};
