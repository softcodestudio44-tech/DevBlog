const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model configuration (overridable via env)
// gpt-oss-120b is the smartest model available on this Groq key.
const GENERAL_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const CODE_MODEL = process.env.GROQ_CODE_MODEL || 'openai/gpt-oss-120b';

const callGroq = async ({ model, system, messages, temperature = 0.7, maxTokens = 2048 }) => {
  const payload = {
    model,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const response = await axios.post(GROQ_URL, payload, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
    return response.data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    const status = error.response?.status;
    const rawMessage = error.response?.data?.error?.message || '';
    const isModelError = status === 404 || (status === 400 && /model/i.test(rawMessage));

    if (isModelError && model !== GENERAL_MODEL) {
      console.log(`Model "${model}" unavailable, falling back to "${GENERAL_MODEL}"`);
      return callGroq({ model: GENERAL_MODEL, system, messages, temperature, maxTokens });
    }

    const wrapped = new Error(rawMessage || error.message);
    wrapped.status = status;
    wrapped.raw = error;
    throw wrapped;
  }
};

const formatHistory = (history) => {
  if (!Array.isArray(history) || history.length === 0) return [];
  return history.slice(-10).map((msg) => ({
    role: msg.from === 'betty' ? 'assistant' : 'user',
    content: msg.text,
  }));
};

const sendErrorResponse = (res, error) => {
  console.error('Betty AI error:', error.raw?.response?.data || error.message);
  const retryAfter = error.raw?.response?.headers?.['retry-after'] || '60';

  if (error.status === 429) {
    return res.status(429).json({
      response: `**Rate limit reached.** Please wait ${retryAfter} seconds before trying again.\n\nFree tier limits: 30 requests/min, 1,000 requests/day.`,
      from: 'Betty AI',
    });
  }

  res.status(500).json({
    response: `**Betty AI Error:** ${error.message || 'Unknown error'}`,
    from: 'Betty AI',
  });
};

const BETTY_SYSTEM = `You are Betty AI, the built-in assistant on DevBlog - a developer blogging platform with a shared feed, community chat, direct messages, and notifications.

Personality and behavior:
- Be friendly, concise, and practical. Developers are your primary audience.
- When asked to write or improve a blog post, use a clear structure: intro, key points, code examples, and a conclusion.
- Always use markdown with fenced code blocks for code, and include the language tag (e.g. javascript).
- Prefer modern, correct, idiomatic solutions. If something is deprecated, say so.
- If a request is ambiguous, ask one clarifying question instead of guessing.
- Never invent API names, packages, or facts. If you are unsure, say so honestly.
- Keep responses scannable: short paragraphs, bullet points, and code blocks.`;

const aiChat = async (req, res) => {
  try {
    const { message, context, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    console.log('Betty AI received:', message.substring(0, 50));

    const historyMessages = formatHistory(history);
    const userContent = historyMessages.length > 0
      ? message
      : `User context: ${context || 'General developer question'}\n\nUser: ${message}`;

    const text = await callGroq({
      model: GENERAL_MODEL,
      system: BETTY_SYSTEM,
      messages: [...historyMessages, { role: 'user', content: userContent }],
      temperature: 0.7,
      maxTokens: 2048,
    });

    console.log('Betty AI responded:', text.substring(0, 50));
    res.json({ response: text || "I'm not sure how to respond to that. Try asking something else!", from: 'Betty AI' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const explainCode = async (req, res) => {
  try {
    const { code, language, history } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const text = await callGroq({
      model: CODE_MODEL,
      system: `You are Betty AI, a code explainer for developers. Explain code in simple terms, breaking it down section by section. Be beginner-friendly but accurate. Point out potential bugs or improvements. Use markdown and keep line references when helpful.`,
      messages: [
        ...formatHistory(history),
        { role: 'user', content: `Explain this ${language || 'code'}:\n\n\`\`\`\n${code}\n\`\`\`` },
      ],
      temperature: 0.3,
      maxTokens: 2048,
    });

    res.json({ explanation: text || "I couldn't explain that code. Please try again!", from: 'Betty AI' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const summarizeArticle = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const text = await callGroq({
      model: GENERAL_MODEL,
      system: `You are Betty AI. Summarize articles into 3-5 key bullet points. Keep it concise and developer-focused. Include a short TL;DR line at the top.`,
      messages: [
        { role: 'user', content: `Summarize this article:\n\n${content}` },
      ],
      temperature: 0.3,
      maxTokens: 1024,
    });

    res.json({ summary: text || "I couldn't summarize that. Please try again!", from: 'Betty AI' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

const helpWrite = async (req, res) => {
  try {
    const { topic, type, currentText, history } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    const text = await callGroq({
      model: GENERAL_MODEL,
      system: `You are Betty AI, a writing assistant for developer blog posts. Help structure, improve, and create content. Return ready-to-paste markdown with clear headings, code examples, and a strong intro and conclusion.`,
      messages: [
        ...formatHistory(history),
        { role: 'user', content: `Help me write a ${type || 'blog post'} about: ${topic}\n\n${currentText ? `Current draft: ${currentText}` : ''}` },
      ],
      temperature: 0.7,
      maxTokens: 2048,
    });

    res.json({ suggestions: text || "I couldn't help with that. Please try again!", from: 'Betty AI' });
  } catch (error) {
    sendErrorResponse(res, error);
  }
};

module.exports = { aiChat, explainCode, summarizeArticle, helpWrite };
