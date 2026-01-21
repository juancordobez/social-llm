/**
 * PersonalityEngine v1 - Prompts
 * 
 * Templates de prompts para el LLM.
 * Centralizados aquí para fácil modificación.
 */

/**
 * Prompt para analizar posts y extraer traits
 * @param {Array} posts - Posts de ejemplo
 * @param {string} bio - Bio del usuario (opcional)
 */
function buildAnalysisPrompt(posts, bio = '') {
  return `Analyze the following text samples from a social media user and extract their personality traits.

${bio ? `USER BIO: ${bio}\n` : ''}
SAMPLE POSTS:
${posts.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}

Respond with a JSON object following this exact structure:
{
  "tone": {
    "formality": 0.0-1.0,
    "humor": 0.0-1.0,
    "enthusiasm": 0.0-1.0,
    "empathy": 0.0-1.0
  },
  "style": {
    "verbosity": 0.0-1.0,
    "complexity": 0.0-1.0,
    "emojiUsage": 0.0-1.0,
    "hashtagUsage": 0.0-1.0
  },
  "topics": ["main", "topics", "discussed"],
  "vocabulary": {
    "preferredWords": ["words", "used", "often"],
    "catchphrases": ["signature", "phrases"]
  },
  "confidence": 0.0-1.0,
  "summary": "One paragraph describing this person's communication style"
}`;
}

/**
 * System prompt para análisis
 */
const ANALYSIS_SYSTEM_PROMPT = 
  'You are an expert psycholinguistic analyst. ' +
  'Analyze text patterns to identify personality traits. ' +
  'Respond only with valid JSON, no explanations.';

/**
 * Genera system prompt para crear contenido con una personalidad
 * @param {Object} traits - Traits de personalidad
 * @param {string} platform - twitter, linkedin, etc
 */
function buildPersonalitySystemPrompt(traits, platform = 'twitter') {
  const toneDesc = describeTone(traits.tone);
  const styleDesc = describeStyle(traits.style);
  const platformGuide = getPlatformGuide(platform);

  return `You are a social media content creator with this personality:

${toneDesc}
${styleDesc}

${traits.topics?.length > 0 
  ? `EXPERTISE: ${traits.topics.join(', ')}` 
  : ''}

${traits.vocabulary?.catchphrases?.length > 0 
  ? `SIGNATURE PHRASES: "${traits.vocabulary.catchphrases.join('", "')}"` 
  : ''}

${traits.vocabulary?.preferredWords?.length > 0 
  ? `VOCABULARY: Uses words like: ${traits.vocabulary.preferredWords.join(', ')}` 
  : ''}

${platformGuide}

RULES:
- Write AS this person, not ABOUT them
- Be authentic and consistent
- No meta-commentary ("Here's a tweet about...")
- Just write the content directly`;
}

/**
 * Convierte scores de tono a descripción legible
 */
function describeTone(tone) {
  const parts = [];

  // Formality
  if (tone.formality < 0.3) parts.push('very casual and relaxed');
  else if (tone.formality > 0.7) parts.push('professional and formal');
  else parts.push('conversational');

  // Humor
  if (tone.humor > 0.6) parts.push('witty and humorous');
  else if (tone.humor < 0.2) parts.push('serious');

  // Enthusiasm
  if (tone.enthusiasm > 0.7) parts.push('highly enthusiastic');
  else if (tone.enthusiasm < 0.3) parts.push('calm and measured');

  // Empathy
  if (tone.empathy > 0.7) parts.push('warm and empathetic');
  else if (tone.empathy < 0.3) parts.push('direct and straightforward');

  return `TONE: ${parts.join(', ')}`;
}

/**
 * Convierte scores de estilo a descripción legible
 */
function describeStyle(style) {
  const parts = [];

  if (style.verbosity < 0.3) parts.push('concise');
  else if (style.verbosity > 0.7) parts.push('detailed');

  if (style.complexity > 0.7) parts.push('technical language');
  else if (style.complexity < 0.3) parts.push('simple language');

  if (style.emojiUsage > 0.5) parts.push('uses emojis');
  else if (style.emojiUsage < 0.2) parts.push('minimal emojis');

  return `STYLE: ${parts.join(', ')}`;
}

/**
 * Guías específicas por plataforma
 */
function getPlatformGuide(platform) {
  const guides = {
    twitter: `PLATFORM: Twitter
- Max 280 characters
- Be punchy
- 1-2 hashtags max`,

    linkedin: `PLATFORM: LinkedIn
- Professional tone
- Can be longer
- 3-5 hashtags`,

    instagram: `PLATFORM: Instagram
- Visual focus
- Emojis welcome
- Hashtags at end`,

    general: `PLATFORM: General
- Adapt to context`,
  };

  return guides[platform] || guides.general;
}

/**
 * Prompts para diferentes tipos de contenido
 */
const CONTENT_PROMPTS = {
  post: (topic, context) => 
    `Create a social media post about: ${topic}
${context ? `\nCONTEXT: ${context}` : ''}
Write the post directly.`,

  reply: (context) =>
    `Write a reply to this message:
"${context}"
Keep it natural and on-brand.`,

  comment: (topic, context) =>
    `Write a comment responding to:
"${context}"
Topic: ${topic}
Add value to the conversation.`,

  thread: (topic, context) =>
    `Create a thread (3-5 posts) about: ${topic}
${context ? `\nCONTEXT: ${context}` : ''}
Format:
1/ Hook
2/ Point 1
3/ Point 2
4/ Conclusion`,
};

/**
 * Prompt para evaluar autenticidad de contenido
 */
function buildScoringPrompt(content, traits) {
  return `Evaluate if this content matches the personality profile.

CONTENT:
"${content}"

EXPECTED TRAITS:
- Formality: ${traits.tone.formality} (0=casual, 1=formal)
- Humor: ${traits.tone.humor}
- Enthusiasm: ${traits.tone.enthusiasm}
- Verbosity: ${traits.style.verbosity}
- Complexity: ${traits.style.complexity}
- Topics: ${traits.topics?.join(', ') || 'any'}

Respond in JSON:
{
  "overall": 0.0-1.0,
  "toneMatch": 0.0-1.0,
  "styleMatch": 0.0-1.0,
  "feedback": "One sentence suggestion"
}`;
}

const SCORING_SYSTEM_PROMPT = 
  'You are a content authenticity evaluator. ' +
  'Score how well content matches a personality. ' +
  'Respond only with valid JSON.';

module.exports = {
  buildAnalysisPrompt,
  ANALYSIS_SYSTEM_PROMPT,
  buildPersonalitySystemPrompt,
  describeTone,
  describeStyle,
  getPlatformGuide,
  CONTENT_PROMPTS,
  buildScoringPrompt,
  SCORING_SYSTEM_PROMPT,
};
