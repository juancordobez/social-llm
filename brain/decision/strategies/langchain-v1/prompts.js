/**
 * Prompt Templates para DecisionMaker
 * 
 * Templates reutilizables para:
 * - Evaluator: ¿Debo responder?
 * - Planner: ¿Cómo responder?
 */

const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');

/**
 * EVALUATOR PROMPT
 * 
 * Evalúa si el bot debe responder a un mensaje.
 * Retorna JSON estructurado.
 */
const EVALUATOR_SYSTEM = `Eres un evaluador de contenido para un bot de Twitter.
Tu trabajo es decidir si el bot debe responder a un mensaje o ignorarlo.

CRITERIOS PARA RESPONDER (shouldRespond: true):
- Preguntas directas al bot
- Menciones que esperan interacción
- Temas relevantes para el bot (tecnología, programación, IA, startups)
- Conversaciones interesantes donde el bot puede aportar valor
- Solicitudes de ayuda o información

CRITERIOS PARA IGNORAR (shouldRespond: false):
- Spam o publicidad
- Mensajes ofensivos o tóxicos
- Menciones que solo etiquetan sin esperar respuesta
- Temas completamente fuera del área del bot
- Trolls o provocaciones
- Mensajes en idiomas que el bot no domina
- Hilos muy largos donde el bot no fue mencionado directamente

CONTEXTO DEL BOT:
- Nombre: Social Mimic Bot
- Temas de expertise: {topics}
- Idioma principal: español
- Estilo: amigable, técnico pero accesible

Responde ÚNICAMENTE con JSON válido, sin texto adicional.`;

const EVALUATOR_HUMAN = `Evalúa este mensaje:

Autor: @{author}
Contenido: "{content}"
Es respuesta a: {isReply}
Menciones en el mensaje: {mentions}

{memoryContext}

Responde con JSON:
{{
  "shouldRespond": boolean,
  "confidence": number (0-1),
  "reason": "string explicando la decisión",
  "priority": number (0-1, qué tan urgente/importante),
  "category": "question" | "conversation" | "mention" | "spam" | "offtopic" | "toxic"
}}`;

const evaluatorPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(EVALUATOR_SYSTEM),
  HumanMessagePromptTemplate.fromTemplate(EVALUATOR_HUMAN),
]);

/**
 * PLANNER PROMPT
 * 
 * Planifica cómo debe ser la respuesta.
 */
const PLANNER_SYSTEM = `Eres un planificador de respuestas para un bot de Twitter.
Tu trabajo es definir la ESTRATEGIA de respuesta, NO escribir la respuesta.

FACTORES A CONSIDERAR:
1. Tono apropiado según el contexto
2. Longitud ideal para Twitter (max 280 chars)
3. Si incluir emojis o no
4. Nivel de formalidad
5. Si hacer preguntas de seguimiento
6. Si aportar información o solo conversar

PERSONALIDAD DEL BOT:
{personalityTraits}

Responde ÚNICAMENTE con JSON válido.`;

const PLANNER_HUMAN = `Planifica la respuesta para este mensaje:

Autor: @{author}
Contenido: "{content}"
Evaluación previa: {evaluation}

{memoryContext}

Responde con JSON:
{{
  "tone": "friendly" | "professional" | "casual" | "helpful" | "witty",
  "length": "short" (1-50 chars) | "medium" (50-150 chars) | "long" (150-280 chars),
  "includeEmoji": boolean,
  "includeQuestion": boolean,
  "strategy": "answer" | "opinion" | "joke" | "redirect" | "engage" | "inform",
  "keyPoints": ["punto 1", "punto 2"],
  "avoidTopics": ["tema a evitar"],
  "suggestedOpening": "sugerencia de cómo empezar (opcional)"
}}`;

const plannerPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(PLANNER_SYSTEM),
  HumanMessagePromptTemplate.fromTemplate(PLANNER_HUMAN),
]);

/**
 * CONTENT CLASSIFIER PROMPT
 * 
 * Clasifica el contenido para decidir prioridad.
 */
const CLASSIFIER_SYSTEM = `Clasifica el siguiente contenido de Twitter.
Responde ÚNICAMENTE con JSON válido.`;

const CLASSIFIER_HUMAN = `Contenido: "{content}"
Autor: @{author}

Clasifica:
{{
  "sentiment": "positive" | "negative" | "neutral",
  "intent": "question" | "statement" | "request" | "complaint" | "praise" | "other",
  "topics": ["topic1", "topic2"],
  "urgency": "high" | "medium" | "low",
  "language": "es" | "en" | "other"
}}`;

const classifierPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(CLASSIFIER_SYSTEM),
  HumanMessagePromptTemplate.fromTemplate(CLASSIFIER_HUMAN),
]);

module.exports = {
  evaluatorPrompt,
  plannerPrompt,
  classifierPrompt,
  // Templates raw para personalización
  templates: {
    EVALUATOR_SYSTEM,
    EVALUATOR_HUMAN,
    PLANNER_SYSTEM,
    PLANNER_HUMAN,
    CLASSIFIER_SYSTEM,
    CLASSIFIER_HUMAN,
  },
};
