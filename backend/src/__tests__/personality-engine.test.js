/**
 * Social Mimic - PersonalityEngine Tests
 * @description Tests para el motor de personalidad
 */

const { PersonalityEngine, DEFAULT_TRAITS } = require('../core/personality-engine');

// Mock del AI adapter
const mockAI = {
  generateText: jest.fn(),
};

describe('PersonalityEngine', () => {
  let engine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new PersonalityEngine({ 
      aiAdapter: mockAI,
      logger: { log: jest.fn(), error: jest.fn() },
    });
  });

  describe('analyzeProfile', () => {
    test('returns basic traits when no samples provided', async () => {
      const result = await engine.analyzeProfile({
        bio: 'Tech entrepreneur',
        preferences: {
          tone: { formality: 0.3 },
          topics: ['startups', 'AI'],
        },
      });

      expect(result.tone.formality).toBe(0.3);
      expect(result.topics).toContain('startups');
      expect(result.confidence).toBe(0.5);
    });

    test('analyzes samples with AI when provided', async () => {
      mockAI.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          tone: { formality: 0.2, humor: 0.7, enthusiasm: 0.8, empathy: 0.5 },
          style: { verbosity: 0.3, complexity: 0.4, emoji_usage: 0.6, hashtag_style: 0.3 },
          topics: ['technology', 'startups', 'AI'],
          vocabulary: {
            preferred_words: ['awesome', 'game-changer'],
            catchphrases: ['Let\'s go!'],
          },
          behavior: { engagement_style: 'active' },
          confidence: 0.85,
          summary: 'Enthusiastic tech person',
        }),
      });

      const result = await engine.analyzeProfile({
        bio: 'Building the future',
        samplePosts: [
          'Just shipped a new feature! 🚀 This is awesome!',
          'AI is a total game-changer. Let\'s go!',
          'Thoughts on the latest tech trends?',
        ],
      });

      expect(mockAI.generateText).toHaveBeenCalled();
      expect(result.tone.humor).toBe(0.7);
      expect(result.topics).toContain('technology');
      expect(result.confidence).toBe(0.85);
    });

    test('handles AI analysis failure gracefully', async () => {
      mockAI.generateText.mockRejectedValueOnce(new Error('API Error'));

      const result = await engine.analyzeProfile({
        samplePosts: ['Test post'],
      });

      expect(result.confidence).toBe(0.5);
      expect(result).toHaveProperty('tone');
    });
  });

  describe('generateSystemPrompt', () => {
    test('generates prompt for casual twitter user', () => {
      const traits = {
        ...DEFAULT_TRAITS,
        tone: { formality: 0.2, humor: 0.7, enthusiasm: 0.8, empathy: 0.5 },
        style: { verbosity: 0.2, complexity: 0.3, emoji_usage: 0.7, hashtag_style: 0.5 },
        topics: ['tech', 'startups'],
        vocabulary: {
          catchphrases: ['Let\'s build!'],
          preferred_words: ['awesome', 'ship'],
        },
        behavior: { engagement_style: 'active' },
        objectives: { call_to_action_style: 'subtle' },
      };

      const prompt = engine.generateSystemPrompt(traits, 'twitter');

      expect(prompt).toContain('casual');
      expect(prompt).toContain('humor');
      expect(prompt).toContain('tech, startups');
      expect(prompt).toContain('Let\'s build!');
      expect(prompt).toContain('280 characters');
      expect(prompt).toContain('subtle');
    });

    test('generates prompt for formal linkedin user', () => {
      const traits = {
        ...DEFAULT_TRAITS,
        tone: { formality: 0.8, humor: 0.2, enthusiasm: 0.5, empathy: 0.7 },
        style: { verbosity: 0.7, complexity: 0.6, emoji_usage: 0.1, hashtag_style: 0.3 },
        topics: ['leadership', 'management'],
        behavior: { engagement_style: 'balanced' },
      };

      const prompt = engine.generateSystemPrompt(traits, 'linkedin');

      expect(prompt).toContain('professional');
      expect(prompt).toContain('formal');
      expect(prompt).toContain('detailed');
      expect(prompt).toContain('LinkedIn');
    });
  });

  describe('generateContent', () => {
    test('generates post content', async () => {
      mockAI.generateText.mockResolvedValueOnce({
        text: '🚀 Just discovered an amazing AI tool that\'s changing how we work! #AI #Productivity',
        model: 'llama-3.1-70b',
        usage: { totalTokens: 50 },
      });

      const traits = {
        ...DEFAULT_TRAITS,
        tone: { formality: 0.3, humor: 0.5, enthusiasm: 0.7, empathy: 0.5 },
        style: { verbosity: 0.3, complexity: 0.4, emoji_usage: 0.6, hashtag_style: 0.6 },
        topics: ['AI', 'productivity'],
        objectives: { primary_goal: 'engagement' },
      };

      const result = await engine.generateContent(traits, {
        topic: 'AI productivity tools',
        platform: 'twitter',
        contentType: 'post',
      });

      expect(result.content).toContain('AI');
      expect(result.platform).toBe('twitter');
      expect(result.model).toBe('llama-3.1-70b');
    });

    test('generates thread content', async () => {
      mockAI.generateText.mockResolvedValueOnce({
        text: `1/ Thread about AI in 2026...
2/ First point...
3/ Second point...
4/ Conclusion`,
        model: 'llama-3.1-70b',
        usage: { totalTokens: 100 },
      });

      const result = await engine.generateContent(DEFAULT_TRAITS, {
        topic: 'AI trends',
        platform: 'twitter',
        contentType: 'thread',
      });

      expect(result.content).toContain('1/');
      expect(result.contentType).toBe('thread');
    });
  });

  describe('scoreContentMatch', () => {
    test('scores content against personality', async () => {
      mockAI.generateText.mockResolvedValueOnce({
        text: JSON.stringify({
          overall_score: 0.85,
          tone_match: 0.9,
          style_match: 0.8,
          authenticity: 0.85,
          feedback: 'Good match, slightly too formal',
        }),
      });

      const traits = {
        ...DEFAULT_TRAITS,
        tone: { formality: 0.3, humor: 0.5, enthusiasm: 0.7, empathy: 0.5 },
        topics: ['tech'],
      };

      const result = await engine.scoreContentMatch(
        'Awesome new tech drop! 🔥',
        traits
      );

      expect(result.overall_score).toBe(0.85);
      expect(result.feedback).toContain('formal');
    });

    test('handles scoring failure', async () => {
      mockAI.generateText.mockRejectedValueOnce(new Error('API Error'));

      const result = await engine.scoreContentMatch('Test', DEFAULT_TRAITS);

      expect(result.overall_score).toBe(0.5);
      expect(result.feedback).toContain('error');
    });
  });

  describe('simplifyTraits', () => {
    test('converts scores to readable labels', () => {
      const traits = {
        tone: { formality: 0.2, humor: 0.8, enthusiasm: 0.5 },
        style: { verbosity: 0.9, complexity: 0.1 },
        topics: ['tech', 'AI', 'startups', 'crypto', 'web3', 'extra'],
        confidence: 0.75,
      };

      const simplified = engine.simplifyTraits(traits);

      expect(simplified.tone).toBe('Casual');
      expect(simplified.humor).toBe('Humorous');
      expect(simplified.style).toBe('Detailed');
      expect(simplified.complexity).toBe('Simple');
      expect(simplified.topics).toHaveLength(5);
      expect(simplified.confidence).toBe('75%');
    });
  });
});

// ==================== INTEGRATION TESTS ====================

describe('PersonalityEngine - Example Profiles', () => {
  let engine;

  beforeEach(() => {
    engine = new PersonalityEngine({
      aiAdapter: {
        generateText: jest.fn().mockImplementation((prompt) => {
          // Simulate different personality analysis
          if (prompt.includes('entrepreneur')) {
            return Promise.resolve({
              text: JSON.stringify({
                tone: { formality: 0.3, humor: 0.5, enthusiasm: 0.9, empathy: 0.4 },
                style: { verbosity: 0.3, complexity: 0.5, emoji_usage: 0.7, hashtag_style: 0.5 },
                topics: ['startups', 'hustle', 'growth'],
                confidence: 0.8,
              }),
            });
          }
          if (prompt.includes('corporate')) {
            return Promise.resolve({
              text: JSON.stringify({
                tone: { formality: 0.9, humor: 0.1, enthusiasm: 0.4, empathy: 0.6 },
                style: { verbosity: 0.8, complexity: 0.7, emoji_usage: 0.1, hashtag_style: 0.2 },
                topics: ['leadership', 'strategy', 'management'],
                confidence: 0.85,
              }),
            });
          }
          return Promise.resolve({ text: '{}' });
        }),
      },
      logger: { log: jest.fn(), error: jest.fn() },
    });
  });

  test('Profile 1: Tech Entrepreneur', async () => {
    const traits = await engine.analyzeProfile({
      bio: 'Serial entrepreneur. Building in public.',
      samplePosts: [
        'Just shipped v2! 🚀 entrepreneur life',
        'Hustle mode: ON. Let\'s get it!',
      ],
    });

    expect(traits.tone.enthusiasm).toBeGreaterThan(0.7);
    expect(traits.style.emoji_usage).toBeGreaterThan(0.5);
    expect(traits.topics).toContain('startups');
  });

  test('Profile 2: Corporate Executive', async () => {
    const traits = await engine.analyzeProfile({
      bio: 'VP of Operations at Fortune 500',
      samplePosts: [
        'Effective corporate leadership requires strategic vision.',
        'Our quarterly results demonstrate sustained growth.',
      ],
    });

    expect(traits.tone.formality).toBeGreaterThan(0.7);
    expect(traits.style.emoji_usage).toBeLessThan(0.3);
    expect(traits.topics).toContain('leadership');
  });

  test('Profile 3: Manual Configuration', async () => {
    const traits = await engine.analyzeProfile({
      bio: 'Designer',
      preferences: {
        tone: { formality: 0.5, humor: 0.6, enthusiasm: 0.7, empathy: 0.8 },
        style: { verbosity: 0.4, complexity: 0.3, emoji_usage: 0.5, hashtag_style: 0.4 },
        topics: ['design', 'UX', 'creativity'],
      },
    });

    expect(traits.tone.empathy).toBe(0.8);
    expect(traits.topics).toContain('design');
    expect(traits.confidence).toBe(0.5); // Lower confidence for manual
  });
});
