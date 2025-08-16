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

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please login again' 
      });
    }

    // Get user profile from database (optional)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If profile doesn't exist, create a temporary one
    if (profileError || !profile) {
      console.warn(`Profile not found for user ${user.id}, using fallback`);
      req.profile = {
        id: user.id,
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: 'student',
        avatar_url: null,
        phone: null,
        country: null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };
    } else {
      req.profile = profile;
    }

    // Attach user and profile to request object
    req.user = user;
    req.profile = profile;
    
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

const requireInstructor = async (req, res, next) => {
  try {
    if (!req.profile) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please login first' 
      });
    }

    if (!['admin', 'instructor'].includes(req.profile.role)) {
      return res.status(403).json({ 
        error: 'Instructor access required',
        message: 'You do not have permission to perform this action' 
      });
    }

    next();
  } catch (error) {
    console.error('Instructor authorization error:', error);
    return res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Unable to verify instructor permissions' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireInstructor
};
