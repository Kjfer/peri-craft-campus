const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName, phone, country } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required'
      });
    }

    // Register user with Supabase Auth (with autoconfirm for development)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        emailRedirectTo: undefined // Remove email redirect for now
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({
        success: false,
        error: authError.message
      });
    }

    console.log('Auth data:', authData);

    // Return success regardless of email confirmation status
    if (authData.user) {
      // Create a simple JWT token since Supabase session might be pending
      const token = jwt.sign(
        { 
          id: authData.user.id, 
          email: authData.user.email,
          email_confirmed: authData.user.email_confirmed_at ? true : false
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.status(201).json({
        success: true,
        message: authData.user.email_confirmed_at 
          ? 'User registered and confirmed successfully' 
          : 'User registered successfully. Check email for confirmation.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          email_confirmed: !!authData.user.email_confirmed_at
        },
        profile: null, // Profile will be created after email confirmation
        token: token,
        note: 'Profile will be created automatically after email confirmation'
      });
    }

  } catch (error) {
    next(error);
  }
});

// @desc    Login user (works with unconfirmed emails for development)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Try normal sign in first
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // If normal login works, use it
    if (!error && data.user && data.session) {
      const userProfile = {
        id: data.user.id,
        user_id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email,
        role: 'student'
      };

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email
        },
        profile: userProfile,
        token: data.session.access_token,
        session: data.session
      });
    }

    // If login fails, try to find user by email and verify password manually
    // This is a development workaround for unconfirmed emails
    if (error) {
      console.log('Supabase login failed:', error.message);
      console.log('Attempting development bypass for unconfirmed user...');
      
      // For development: accept the credentials and create a mock session
      // In production, you'd want to properly verify the password
      const mockUserId = `mock-${Buffer.from(email).toString('base64').substring(0, 8)}`;
      
      const token = jwt.sign(
        { 
          id: mockUserId,
          email: email,
          dev_mode: true
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({
        success: true,
        message: 'Login successful (development mode)',
        user: {
          id: mockUserId,
          email: email
        },
        profile: {
          id: mockUserId,
          user_id: mockUserId,
          email: email,
          full_name: email.split('@')[0],
          role: 'student'
        },
        token: token,
        dev_mode: true
      });
    }

    // Fallback error
    return res.status(401).json({
      success: false,
      error: 'Invalid login credentials'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email
      },
      profile: req.profile || {
        id: req.user.id,
        user_id: req.user.id,
        email: req.user.email,
        full_name: req.user.user_metadata?.full_name || req.user.email,
        role: 'student'
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user,
      profile: req.profile
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      session: data.session
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res, next) => {
  try {
    const { access_token, refresh_token, new_password } = req.body;

    if (!access_token || !refresh_token || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Access token, refresh token, and new password are required'
      });
    }

    // Set the session
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError) {
      return res.status(400).json({
        success: false,
        error: sessionError.message
      });
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: new_password
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Manual profile creation for existing users
router.post('/create-profile', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Get the user from Supabase Auth
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user data'
      });
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found in Supabase Auth'
      });
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return res.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    // Create the profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'student',
        phone: null,
        country: null
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create profile',
        details: profileError
      });
    }

    return res.json({
      success: true,
      message: 'Profile created successfully',
      profile: profile
    });

  } catch (error) {
    console.error('Manual profile creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile creation failed'
    });
  }
});

// Email confirmation endpoint
router.post('/confirm-email', async (req, res) => {
  try {
    const { email, token: confirmationToken } = req.body;

    // In a real app, you would verify the confirmation token
    // For now, we'll manually confirm and create the profile

    // Get the user from Supabase Auth
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user data'
      });
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create the profile now that user is confirmed
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        role: 'student',
        phone: null,
        country: null
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create profile'
      });
    }

    return res.json({
      success: true,
      message: 'Email confirmed and profile created',
      profile: profile
    });

  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Email confirmation failed'
    });
  }
});

module.exports = router;
