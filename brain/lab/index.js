/**
 * Brain Lab - Herramientas de testing y experimentación
 * 
 * Permite probar estrategias sin consumir tokens reales.
 */

const { MockLLM, createMockLLM, MOCK_RESPONSES, MOCK_CONTENT } = require('./mock-llm');

module.exports = {
  MockLLM,
  createMockLLM,
  MOCK_RESPONSES,
  MOCK_CONTENT,
};
