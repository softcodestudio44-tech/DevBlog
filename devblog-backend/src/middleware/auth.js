const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Validate the Supabase access token against the Auth API
    const { data } = await axios.get(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    });

    req.user = {
      id: data.id,
      email: data.email,
      name: data.user_metadata?.name || data.email?.split('@')[0] || 'User',
      avatar: data.user_metadata?.avatar,
    };

    next();
  } catch (error) {
    console.error('Supabase auth verification failed:', error.message);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
