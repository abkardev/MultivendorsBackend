const TRANSLATION_PROVIDER = process.env.TRANSLATION_PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT) || 30000;

const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr', 'es', 'de', 'zh', 'ja', 'ko', 'tr', 'ur', 'hi', 'pt', 'ru'];

async function fetchWithTimeout(url, options, timeoutMs = AI_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function translateWithOpenAI(text, targetLang, sourceLang) {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLang || 'the detected language'} to ${targetLang}. Return ONLY the translated text, no explanations, no quotes, no markdown. Preserve all HTML tags, variables ({{...}}), and formatting.`,
        },
        { role: 'user', content: text },
      ],
      max_tokens: Math.max(text.length * 2, 1000),
      temperature: 0.1,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI translation error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

async function translateWithDeepL(text, targetLang, sourceLang) {
  const params = new URLSearchParams({
    text,
    target_lang: targetLang.toUpperCase(),
  });
  if (sourceLang) params.append('source_lang', sourceLang.toUpperCase());

  const response = await fetchWithTimeout('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `DeepL error: ${response.status}`);
  }
  const data = await response.json();
  return data.translations?.[0]?.text || text;
}

async function translateWithGoogle(text, targetLang, sourceLang) {
  const params = new URLSearchParams({
    q: text,
    target: targetLang,
    key: GOOGLE_TRANSLATE_API_KEY,
  });
  if (sourceLang) params.append('source', sourceLang);

  const response = await fetchWithTimeout(`https://translation.googleapis.com/language/translate/v2?${params}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Translate error: ${response.status}`);
  }
  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText || text;
}

export async function translateText(text, targetLang, sourceLang) {
  if (!text || !targetLang) {
    throw new Error('text and targetLang are required');
  }
  if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
    throw new Error(`Unsupported target language: ${targetLang}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  switch (TRANSLATION_PROVIDER) {
    case 'deepl':
      if (!DEEPL_API_KEY) throw new Error('DeepL API key not configured');
      return translateWithDeepL(text, targetLang, sourceLang);
    case 'google':
      if (!GOOGLE_TRANSLATE_API_KEY) throw new Error('Google Translate API key not configured');
      return translateWithGoogle(text, targetLang, sourceLang);
    case 'openai':
    default:
      if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured for translation');
      return translateWithOpenAI(text, targetLang, sourceLang);
  }
}

export async function translateBatch(items, targetLang, sourceLang) {
  const results = [];
  for (const item of items) {
    const translated = await translateText(item.text, targetLang, sourceLang);
    results.push({ key: item.key, original: item.text, translated, lang: targetLang });
  }
  return results;
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}
