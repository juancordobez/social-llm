/**
 * Brain - Módulo central de inteligencia para Social Mimic
 * 
 * Exporta todos los componentes cognitivos del sistema:
 * - Brain: Orquestador central
 * - DecisionMaker: Motor de decisiones (LLM)
 * - ResponseGenerator: Generador de respuestas (LLM)
 * - MemorySystem: Sistema de memoria RAG
 * 
 * @usage
 * const { Brain, createBrain } = require('./brain');
 * 
 * // Crear instancia completa
 * const brain = await createBrain({ provider: 'groq' });
 * brain.loadTraits(profileTraits);
 * 
 * const result = await brain.process(message, context);
 * 
 * @usage (componentes individuales)
 * const { createDecisionMaker, createResponseGenerator } = require('./brain');
 * const { createMemorySystem } = require('./brain/memory');
 */

// Componente principal
const { Brain, createBrain } = require('./brain');

// Subcomponentes de decisión
const {
  DecisionMaker,
  createDecisionMaker,
  ResponseGenerator,
  createResponseGenerator,
  Evaluator,
  Planner,
  Scheduler,
} = require('./decision');

// Sistema de memoria
const { createMemorySystem } = require('./memory');

// Exports
module.exports = {
  // Clase principal
  Brain,
  createBrain,
  
  // Decision module
  DecisionMaker,
  createDecisionMaker,
  ResponseGenerator,
  createResponseGenerator,
  Evaluator,
  Planner,
  Scheduler,
  
  // Memory module
  createMemorySystem,
};

// Default export
module.exports.default = Brain;
