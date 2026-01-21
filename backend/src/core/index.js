/**
 * Social Mimic - Core Module
 * @description Exporta los componentes principales del cerebro
 */

const { PersonalityEngine, DEFAULT_TRAITS } = require('./personality-engine');

module.exports = {
  PersonalityEngine,
  DEFAULT_TRAITS,
  
  // Futuro: MemorySystem, DecisionMaker
};
