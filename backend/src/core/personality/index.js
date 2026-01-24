/**
 * PersonalityEngine - Selector de Estrategias
 * 
 * Este módulo permite elegir entre diferentes estrategias
 * de análisis y generación de personalidad.
 * 
 * Las estrategias viven en brain/strategies/ y se importan aquí.
 * 
 * ESTRATEGIAS DISPONIBLES:
 * - trait-scoring-v1: Reducción a métricas numéricas (actual)
 * 
 * FUTURAS ESTRATEGIAS:
 * - few-shot-v2: Ejemplos reales en contexto
 * - rag-v3: Retrieval de contenido similar
 * 
 * @module personality
 */

const path = require('path');

// Ruta al brain (estrategias viven allí)
const BRAIN_STRATEGIES = path.join(__dirname, '../../../../brain/strategies');

// Estrategia actual por defecto
const TraitScoringV1 = require(path.join(BRAIN_STRATEGIES, 'trait-scoring-v1'));

// Mapa de estrategias disponibles
const STRATEGIES = {
  'trait-scoring-v1': TraitScoringV1,
};

// Estrategia por defecto
const DEFAULT_STRATEGY = 'trait-scoring-v1';

/**
 * Obtiene una estrategia de personalidad
 * @param {string} name - Nombre de la estrategia
 * @returns {Object} Módulo de la estrategia
 */
function getStrategy(name = DEFAULT_STRATEGY) {
  const strategy = STRATEGIES[name];
  if (!strategy) {
    throw new Error(
      `Estrategia "${name}" no encontrada. ` +
      `Disponibles: ${Object.keys(STRATEGIES).join(', ')}`
    );
  }
  return strategy;
}

/**
 * Lista estrategias disponibles
 * @returns {Array<Object>} Info de cada estrategia
 */
function listStrategies() {
  return Object.entries(STRATEGIES).map(([name, mod]) => ({
    name,
    ...mod.STRATEGY_INFO,
  }));
}

// Re-exportar estrategia por defecto para uso simple
const DefaultEngine = TraitScoringV1.PersonalityEngine;

module.exports = DefaultEngine;
module.exports.PersonalityEngine = DefaultEngine;
module.exports.getStrategy = getStrategy;
module.exports.listStrategies = listStrategies;
module.exports.STRATEGIES = STRATEGIES;
module.exports.DEFAULT_STRATEGY = DEFAULT_STRATEGY;

// Re-export de la estrategia actual para compatibilidad
module.exports.DEFAULT_TRAITS = TraitScoringV1.DEFAULT_TRAITS;
module.exports.validateTraits = TraitScoringV1.validateTraits;
module.exports.mergeWithDefaults = TraitScoringV1.mergeWithDefaults;
module.exports.analyzeFromSamples = TraitScoringV1.analyzeFromSamples;
module.exports.generateContent = TraitScoringV1.generateContent;
module.exports.scoreContent = TraitScoringV1.scoreContent;
