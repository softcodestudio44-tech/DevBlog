const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Free models on Groq (fast & reliable)
const MODEL = 'llama-3.1-8b-instant'; // Fast, good quality, free tier

const aiChat = async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    console.log('Betty AI received:', message.substring(0, 50));

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are Betty AI, a friendly and knowledgeable AI assistant for developers on DevBlog. You help with coding, writing, and technical questions. Be concise but helpful.'
        },
        {
          role: 'user',
          content: `User context: ${context || 'General developer question'}\n\nUser: ${message}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
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
    res.status(500).json({ 
      message: 'Betty AI is having trouble. Please try again!',
      error: error.response?.data?.error?.message || error.message 
    });
  }
};

const explainCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are Betty AI, a code explainer for developers. Explain code in simple terms, breaking it down line by line. Keep it beginner-friendly but accurate.'
        },
        {
          role: 'user',
          content: `Explain this ${language || 'code'}:\n\n\`\`\`\n${code}\n\`\`\``
        }
      ],
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
    res.status(500).json({ message: 'Betty AI is thinking... try again!' });
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
    res.status(500).json({ message: 'Betty AI is thinking... try again!' });
  }
};

const helpWrite = async (req, res) => {
  try {
    const { topic, type, currentText } = req.body;
    
    if (!topic) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    const response = await axios.post(GROQ_URL, {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are Betty AI, a writing assistant for developer blog posts. Help improve or create content. Be helpful and developer-focused.'
        },
        {
          role: 'user',
          content: `Help me write a ${type || 'blog post'} about: ${topic}\n\n${currentText ? `Current draft: ${currentText}` : ''}`
        }
      ],
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
    res.status(500).json({ message: 'Betty AI is thinking... try again!' });
  }
};

module.exports = { aiChat, explainCode, summarizeArticle, helpWrite };