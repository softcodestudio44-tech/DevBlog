import { createClient } from 'jsr:@supabase/supabase-js@2';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GENERAL_MODEL = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';
const CODE_MODEL = Deno.env.get('GROQ_CODE_MODEL') || 'openai/gpt-oss-120b';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatHistory(history: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map((msg: any) => ({
    role: msg.from === 'betty' ? 'assistant' : 'user',
    content: msg.text,
  }));
}

async function callGroq(opts: {
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY secret is not set on the edge function');
  }

  const payload = {
    model: opts.model,
    messages: [{ role: 'system', content: opts.system }, ...opts.messages],
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let rawMessage = `Groq request failed with status ${res.status}`;
    try {
      const body = await res.json();
      rawMessage = body?.error?.message || rawMessage;
    } catch {
      // ignore parse failure
    }
    if (res.status === 429) {
      const err = new Error(rawMessage) as Error & { status: number };
      err.status = 429;
      throw err;
    }
    throw new Error(rawMessage);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' }, 500);
    }

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: 'Invalid token' }, 401);
    }

    const body = await req.json();
    const mode = body?.mode || 'chat';

    let result: Record<string, string>;

    if (mode === 'explain') {
      const { code, language } = body;
      if (!code) return json({ error: 'Code is required' }, 400);

      const text = await callGroq({
        model: CODE_MODEL,
        system: `You are Betty AI, a code explainer for developers. Explain code in simple terms, breaking it down section by section. Be beginner-friendly but accurate. Point out potential bugs or improvements. Use markdown and keep line references when helpful.`,
        messages: [
          ...formatHistory(body.history),
          { role: 'user', content: `Explain this ${language || 'code'}:\n\n\`\`\`\n${code}\n\`\`\`` },
        ],
        temperature: 0.3,
        maxTokens: 2048,
      });
      result = { explanation: text || "I couldn't explain that code. Please try again!", from: 'Betty AI' };
    } else if (mode === 'summarize') {
      const { content } = body;
      if (!content) return json({ error: 'Content is required' }, 400);

      const text = await callGroq({
        model: GENERAL_MODEL,
        system: `You are Betty AI. Summarize articles into 3-5 key bullet points. Keep it concise and developer-focused. Include a short TL;DR line at the top.`,
        messages: [{ role: 'user', content: `Summarize this article:\n\n${content}` }],
        temperature: 0.3,
        maxTokens: 1024,
      });
      result = { summary: text || "I couldn't summarize that. Please try again!", from: 'Betty AI' };
    } else if (mode === 'write') {
      const { topic, type, currentText } = body;
      if (!topic) return json({ error: 'Topic is required' }, 400);

      const text = await callGroq({
        model: GENERAL_MODEL,
        system: `You are Betty AI, a writing assistant for developer blog posts. Help structure, improve, and create content. Return ready-to-paste markdown with clear headings, code examples, and a strong intro and conclusion.`,
        messages: [
          ...formatHistory(body.history),
          { role: 'user', content: `Help me write a ${type || 'blog post'} about: ${topic}\n\n${currentText ? `Current draft: ${currentText}` : ''}` },
        ],
        temperature: 0.7,
        maxTokens: 2048,
      });
      result = { suggestions: text || "I couldn't help with that. Please try again!", from: 'Betty AI' };
    } else {
      const { message, context } = body;
      if (!message) return json({ error: 'Message is required' }, 400);

      const historyMessages = formatHistory(body.history);
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
      result = { response: text || "I'm not sure how to respond to that. Try asking something else!", from: 'Betty AI' };
    }

    return json(result);
  } catch (error: any) {
    if (error?.status === 429) {
      return json({
        response: `**Rate limit reached.** Please wait a bit before trying again.\n\nFree tier limits: 30 requests/min, 1,000 requests/day.`,
        from: 'Betty AI',
      }, 429);
    }
    console.error('Betty AI error:', error?.message || error);
    return json({
      response: `**Betty AI Error:** ${error?.message || 'Unknown error'}`,
      from: 'Betty AI',
    }, 500);
  }
});
