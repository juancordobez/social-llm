/**
 * Estrategia: Trait Scoring v1
 * 
 * Reduce la personalidad a métricas numéricas (0-1).
 * 
 * NOMBRE: trait-scoring-v1
 * ENFOQUE: Análisis → Scores numéricos → Prompt engineering
 * 
 * Características:
 * - Simple y rápido
 * - Bajo consumo de tokens
 * - Fácil de ajustar manualmente
 * 
 * Limitaciones:
 * - Pierde matices de personalidad
 * - No captura contexto
 * - Sobre-simplifica
 * 
 * @version 1.0.0-experimental
 */

const PersonalityEngine = require('./engine');
const { DEFAULT_TRAITS, validateTraits, mergeWithDefaults, createEmptyTraits } = require('./traits');
const { analyzeFromSamples, createBasicTraits, combineTraits } = require('./analyzer');
const { generateContent, generateVariations, cleanContent } = require('./generator');
const { scoreContent, selectBest, passesThreshold } = require('./scorer');
const prompts = require('./prompts');

// Metadata de la estrategia
const STRATEGY_INFO = {
  name: 'trait-scoring-v1',
  version: '1.0.0',
  description: 'Reducción de personalidad a métricas numéricas 0-1',
  status: 'experimental',
  author: 'Social Mimic Team',
  createdAt: '2026-01',
};

// Export principal
module.exports = PersonalityEngine;

// Exports nombrados
module.exports.PersonalityEngine = PersonalityEngine;
module.exports.STRATEGY_INFO = STRATEGY_INFO;

// Traits
module.exports.DEFAULT_TRAITS = DEFAULT_TRAITS;
module.exports.validateTraits = validateTraits;
module.exports.mergeWithDefaults = mergeWithDefaults;
module.exports.createEmptyTraits = createEmptyTraits;

// Analyzer
module.exports.analyzeFromSamples = analyzeFromSamples;
module.exports.createBasicTraits = createBasicTraits;
module.exports.combineTraits = combineTraits;

// Generator
module.exports.generateContent = generateContent;
module.exports.generateVariations = generateVariations;
module.exports.cleanContent = cleanContent;

// Scorer
module.exports.scoreContent = scoreContent;
module.exports.selectBest = selectBest;
module.exports.passesThreshold = passesThreshold;

// Prompts
module.exports.prompts = prompts;
