const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid access token' 
      });
    }

    console.log('Authenticating token for /me endpoint...');
    
    // Verify token with Supabase (simple and fast)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token validation failed:', error?.message);
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please login again' 
      });
    }

    console.log('User authenticated successfully:', user.email);

    // Create a basic profile from user metadata (no database query)
    const profile = {
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email.split('@')[0],
      role: 'student',
      avatar_url: user.user_metadata?.avatar_url || null,
      phone: user.user_metadata?.phone || null,
      country: user.user_metadata?.country || null,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    };

    // Attach user and profile to request object
    req.user = user;
    req.profile = profile;
    
    console.log('Profile attached with full_name:', profile.full_name);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ 
      error: 'Authentication failed',
      message: 'Invalid token provided' 
    });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.profile) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login first' 
      });
    }

    if (req.profile.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'You do not have permission to perform this action' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Unable to verify admin permissions' 
    });
  }
};

module.exports = { authenticateToken, requireAdmin };
