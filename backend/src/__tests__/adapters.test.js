/**
 * Social Mimic - Adapter Tests
 * @description Basic tests for all adapters
 */

const {
  createAdapter,
  getAdapter,
  resetAdapters,
  checkAllAdaptersHealth,
  GroqAdapter,
  SupabaseAdapter,
  UpstashAdapter,
} = require('../adapters');

// Mock fetch for testing
global.fetch = jest.fn();

beforeEach(() => {
  resetAdapters();
  fetch.mockClear();
});

describe('Adapter Factory', () => {
  test('creates Groq adapter by default for AI', () => {
    const adapter = createAdapter('ai');
    expect(adapter).toBeInstanceOf(GroqAdapter);
    expect(adapter.name).toBe('groq');
  });

  test('creates Supabase adapter by default for database', () => {
    const adapter = createAdapter('database');
    expect(adapter).toBeInstanceOf(SupabaseAdapter);
    expect(adapter.name).toBe('supabase');
  });

  test('creates Upstash adapter by default for cache', () => {
    const adapter = createAdapter('cache');
    expect(adapter).toBeInstanceOf(UpstashAdapter);
    expect(adapter.name).toBe('upstash');
  });

  test('throws error for unknown adapter type', () => {
    expect(() => createAdapter('unknown')).toThrow('Unknown adapter type');
  });

  test('getAdapter returns singleton instance', () => {
    const adapter1 = getAdapter('ai');
    const adapter2 = getAdapter('ai');
    expect(adapter1).toBe(adapter2);
  });

  test('resetAdapters clears singleton instances', () => {
    const adapter1 = getAdapter('ai');
    resetAdapters();
    const adapter2 = getAdapter('ai');
    expect(adapter1).not.toBe(adapter2);
  });
});

describe('GroqAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new GroqAdapter({
      apiKey: 'test-api-key',
    });
  });

  test('initializes with config', () => {
    expect(adapter.name).toBe('groq');
    expect(adapter.apiKey).toBe('test-api-key');
    expect(adapter.defaultModel).toBe('llama-3.1-70b-versatile');
  });

  test('chat sends correct request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'llama-3.1-70b-versatile',
      }),
    });

    const result = await adapter.chat([
      { role: 'user', content: 'Hi' }
    ]);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key',
        }),
      })
    );

    expect(result.text).toBe('Hello!');
    expect(result.usage.totalTokens).toBe(15);
  });

  test('generateText uses chat internally', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: {},
        model: 'llama-3.1-70b-versatile',
      }),
    });

    const result = await adapter.generateText('Test prompt');
    expect(result.text).toBe('Response');
  });

  test('embed throws not supported error', async () => {
    await expect(adapter.embed('text')).rejects.toThrow('Groq does not support embeddings');
  });

  test('listModels returns available models', async () => {
    const models = await adapter.listModels();
    expect(models).toContain('llama-3.1-70b-versatile');
    expect(models).toContain('llama-3.1-8b-instant');
  });

  test('healthCheck returns ok when configured', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hi' } }],
        usage: {},
        model: 'llama-3.1-70b-versatile',
      }),
    });

    const result = await adapter.healthCheck();
    expect(result.ok).toBe(true);
  });

  test('healthCheck returns not ok when not configured', async () => {
    const unconfiguredAdapter = new GroqAdapter({ apiKey: null });
    const result = await unconfiguredAdapter.healthCheck();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not configured');
  });
});

describe('SupabaseAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new SupabaseAdapter({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    });
  });

  test('initializes with config', () => {
    expect(adapter.name).toBe('supabase');
    expect(adapter.url).toBe('https://test.supabase.co');
  });

  test('create sends POST request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: '123', name: 'Test' }]),
    });

    const result = await adapter.create('profiles', { name: 'Test' });

    expect(fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/rest/v1/profiles',
      expect.objectContaining({
        method: 'POST',
      })
    );

    expect(result.id).toBe('123');
  });

  test('find sends GET request with query params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: '123' }]),
    });

    await adapter.find('profiles', { user_id: 'user-1' }, { limit: 10 });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('profiles?select=*&user_id=eq.user-1&limit=10'),
      expect.any(Object)
    );
  });

  test('update sends PATCH request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([{ id: '123', name: 'Updated' }]),
    });

    await adapter.update('profiles', '123', { name: 'Updated' });

    expect(fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/rest/v1/profiles?id=eq.123',
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });

  test('delete sends DELETE request', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    });

    const result = await adapter.delete('profiles', '123');
    expect(result).toBe(true);
  });
});

describe('UpstashAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new UpstashAdapter({
      url: 'https://test.upstash.io',
      token: 'test-token',
    });
  });

  test('initializes with config', () => {
    expect(adapter.name).toBe('upstash');
    expect(adapter.url).toBe('https://test.upstash.io');
  });

  test('get parses JSON values', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: '{"name":"test"}' }),
    });

    const result = await adapter.get('key');
    expect(result).toEqual({ name: 'test' });
  });

  test('set serializes objects to JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'OK' }),
    });

    await adapter.set('key', { name: 'test' }, 60);

    expect(fetch).toHaveBeenCalledWith(
      'https://test.upstash.io',
      expect.objectContaining({
        body: JSON.stringify(['SET', 'key', '{"name":"test"}', 'EX', 60]),
      })
    );
  });

  test('healthCheck returns ok on PONG', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'PONG' }),
    });

    const result = await adapter.healthCheck();
    expect(result.ok).toBe(true);
  });

  test('checkRateLimit allows within limit', async () => {
    // Mock ZREMRANGEBYSCORE
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 0 }),
    });
    // Mock ZCARD
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 5 }),
    });
    // Mock ZADD
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 1 }),
    });
    // Mock EXPIRE
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 1 }),
    });

    const result = await adapter.checkRateLimit('user-1', 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

describe('Health Check All Adapters', () => {
  test('returns status for all adapters', async () => {
    // Mock all health checks to fail (no real config)
    const result = await checkAllAdaptersHealth();
    
    expect(result).toHaveProperty('healthy');
    expect(result).toHaveProperty('adapters');
    expect(result.adapters).toHaveProperty('ai');
    expect(result.adapters).toHaveProperty('database');
    expect(result.adapters).toHaveProperty('cache');
  });
});
