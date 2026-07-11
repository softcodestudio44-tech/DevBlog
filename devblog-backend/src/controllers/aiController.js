const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Upgraded model for better coding/tech responses
const MODEL = 'llama-3.3-70b-versatile';

const aiChat = async (req, res) => {
  try {
    const { message, context, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    console.log('Betty AI received:', message.substring(0, 50));

    // Build conversation messages from history
    const messages = [
      {
        role: 'system',
        content: `You are Betty AI, a friendly coding assistant for developers on the DevBlog platform. Help with code, debugging, and tech questions. Be concise, accurate, and use markdown for code blocks.`
      },
    ];

    // Add conversation history if provided
    if (Array.isArray(history) && history.length > 0) {
      // Take last 10 messages max for context window
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.from === 'betty' ? 'assistant' : 'user',
          content: msg.text
        });
      });
    } else {
      // No history — single message mode
      messages.push({
        role: 'user',
        content: `User context: ${context || 'General developer question'}\n\nUser: ${message}`
      });
    }

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const text = response.data.choices?.[0]?.message?.content || 
                 "I'm not sure how to respond to that. Try asking something else!";

    console.log('Betty AI responded:', text.substring(0, 50));
    res.json({ response: text, from: 'Betty AI' });
  } catch (error) {
    console.error('Betty AI error:', error.response?.data || error.message);
    
    // Handle rate limit (429) errors specifically
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || '60';
      return res.status(429).json({ 
        response: `⚠️ **Rate limit reached.** Please wait ${retryAfter} seconds before trying again.\n\nFree tier limits: 30 requests/min, 1,000 requests/day.`,
        from: 'Betty AI'
      });
    }
    
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(500).json({ 
      response: `⚠️ **Betty AI Error:** ${errorMsg}`,
      from: 'Betty AI'
    });
  }
};

const explainCode = async (req, res) => {
  try {
    const { code, language, history } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are Betty AI, a code explainer for developers. Explain code in simple terms, breaking it down line by line. Keep it beginner-friendly but accurate.'
      },
    ];

    // Add conversation history
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.from === 'betty' ? 'assistant' : 'user',
          content: msg.text
        });
      });
    }

    messages.push({
      role: 'user',
      content: `Explain this ${language || 'code'}:\n\n\`\`\`\n${code}\n\`\`\``
    });

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 2048
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const text = response.data.choices?.[0]?.message?.content || 
                 "I couldn't explain that code. Please try again!";

    res.json({ explanation: text, from: 'Betty AI' });
  } catch (error) {
    console.error('Betty AI error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || '60';
      return res.status(429).json({ 
        explanation: `⚠️ **Rate limit reached.** Please wait ${retryAfter} seconds.\n\nFree tier: 30 RPM, 1,000 RPD.`,
        from: 'Betty AI'
      });
    }
    
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(500).json({ explanation: `⚠️ **Betty AI Error:** ${errorMsg}`, from: 'Betty AI' });
  }
};

const summarizeArticle = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are Betty AI. Summarize articles into 3-5 key bullet points. Keep it concise and developer-focused.'
        },
        {
          role: 'user',
          content: `Summarize this article:\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const text = response.data.choices?.[0]?.message?.content || 
                 "I couldn't summarize that. Please try again!";

    res.json({ summary: text, from: 'Betty AI' });
  } catch (error) {
    console.error('Betty AI error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || '60';
      return res.status(429).json({ 
        summary: `⚠️ **Rate limit reached.** Please wait ${retryAfter} seconds.\n\nFree tier: 30 RPM, 1,000 RPD.`,
        from: 'Betty AI'
      });
    }
    
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(500).json({ summary: `⚠️ **Betty AI Error:** ${errorMsg}`, from: 'Betty AI' });
  }
};

const helpWrite = async (req, res) => {
  try {
    const { topic, type, currentText, history } = req.body;
    
    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are Betty AI, a writing assistant for developer blog posts. Help improve or create content. Be helpful and developer-focused.'
      },
    ];

    // Add conversation history
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.from === 'betty' ? 'assistant' : 'user',
          content: msg.text
        });
      });
    }

    messages.push({
      role: 'user',
      content: `Help me write a ${type || 'blog post'} about: ${topic}\n\n${currentText ? `Current draft: ${currentText}` : ''}`
    });

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const text = response.data.choices?.[0]?.message?.content || 
                 "I couldn't help with that. Please try again!";

    res.json({ suggestions: text, from: 'Betty AI' });
  } catch (error) {
    console.error('Betty AI error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || '60';
      return res.status(429).json({ 
        suggestions: `⚠️ **Rate limit reached.** Please wait ${retryAfter} seconds.\n\nFree tier: 30 RPM, 1,000 RPD.`,
        from: 'Betty AI'
      });
    }
    
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(500).json({ suggestions: `⚠️ **Betty AI Error:** ${errorMsg}`, from: 'Betty AI' });
  }
};

module.exports = { aiChat, explainCode, summarizeArticle, helpWrite };