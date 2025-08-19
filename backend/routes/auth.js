const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authenticateToken: simpleAuth } = require('../middleware/auth_simple');

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

    // In development, we'll auto-confirm and create profile immediately
    if (authData.user && process.env.NODE_ENV === 'development') {
      try {
        console.log('🔧 Development mode: Setting up user automatically...');

        // Helper: wait/poll until Supabase Auth reports the user exists (avoid FK race)
        const waitForSupabaseUser = async (userId, maxAttempts = 8, baseDelay = 500) => {
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              // Prefer getUserById; fall back to listing users if needed
              if (supabaseAdmin.auth && supabaseAdmin.auth.admin && supabaseAdmin.auth.admin.getUserById) {
                const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
                if (!error && data && data.user) return data.user;
              } else {
                const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
                const found = usersData.users && usersData.users.find(u => u.id === userId);
                if (found) return found;
              }
            } catch (e) {
              console.debug('waitForSupabaseUser attempt error (ignored):', e.message || e);
            }

            // Exponential backoff-ish delay
            const delay = baseDelay * (attempt + 1);
            await new Promise(r => setTimeout(r, delay));
          }
          return null;
        };

        // Wait for the auth user to be visible to the admin API (longer polling to handle Supabase propagation)
        const visibleUser = await waitForSupabaseUser(authData.user.id, 15, 700);
        if (!visibleUser) {
          console.warn('User not visible yet to admin API after extended polling; will wait an extra 2s before final attempts.');
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.log('Supabase auth user is visible to admin API.');
        }

        // Try to create profile with several retries on FK/visibility errors
        const createProfileWithRetries = async (attempts = 5) => {
          for (let i = 0; i < attempts; i++) {
            try {
              console.log(`📝 Profile create attempt ${i + 1}/${attempts}...`);
              const { data: newProfile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                  user_id: authData.user.id,
                  email: authData.user.email,
                  full_name: fullName,
                  role: 'student',
                  phone: phone || null,
                  country: country || null
                }])
                .select()
                .single();

              if (!profileError) {
                return { success: true, profile: newProfile };
              }
 
              // Log more context for FK errors
              if (profileError && profileError.code === '23503') {
                console.warn('FK violation detected when inserting profile (profiles_user_id_fkey). This indicates auth.users row not visible yet.');
              }
              console.warn('Profile creation error (will retry):', profileError.message || profileError);

              // If foreign key / visibility issue, wait a bit longer before retrying
              // Increase delay between retries progressively
              await new Promise(r => setTimeout(r, 700 * (i + 1)));
            } catch (e) {
              console.error('Unexpected profile creation exception:', e.message || e);
              await new Promise(r => setTimeout(r, 700 * (i + 1)));
            }
          }
          return { success: false };
        };

        const created = await createProfileWithRetries(6);
        if (created.success) {
          console.log('✅ Profile created successfully:', created.profile);
        } else {
          console.error('Profile creation failed after retries; will attempt auto-confirm and one final retry.');

          // Try to confirm user first and then a final profile creation
          try {
            const { data: confirmedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
              authData.user.id,
              { email_confirm: true }
            );

            if (confirmError) {
              console.error('Auto-confirm error:', confirmError);
            } else {
              console.log('✅ Email confirmed automatically');
            }
          } catch (e) {
            console.error('Auto-confirm exception:', e.message || e);
          }

          // Final short wait then final attempt
          await new Promise(r => setTimeout(r, 1000));
          const finalAttempt = await createProfileWithRetries(1);
          if (finalAttempt.success) {
            console.log('✅ Profile created on final attempt:', finalAttempt.profile);
          } else {
            console.error('Profile creation still failed after final attempt');
          }
        }

        return res.status(201).json({
          success: true,
          message: 'User registered successfully in development mode',
          user: {
            id: authData.user.id,
            email: authData.user.email,
            full_name: fullName,
            email_confirmed: true
          },
          autoLogin: true // Signal frontend to do auto-login
        });

      } catch (devError) {
        console.error('Development auto-setup error:', devError);
      }
    }

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

// @desc    Login user
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

    // Use Supabase Auth for login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Login error:', authError);
      
      // Handle specific error cases
      if (authError.message === 'Invalid login credentials') {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      if (authError.message === 'Email not confirmed') {
        return res.status(401).json({
          success: false,
          error: 'Please confirm your email before logging in. Check your email inbox.'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: authError.message
      });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({
        success: false,
        error: 'Login failed'
      });
    }

    // Get or create user profile
    let profile = null;
    try {
      const { data: existingProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata?.full_name || authData.user.email.split('@')[0],
            role: 'student',
            phone: null,
            country: null
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('Profile creation error:', createError);
        } else {
          profile = newProfile;
        }
      } else if (!profileError) {
        profile = existingProfile;
      }
    } catch (profileErr) {
      console.error('Profile fetch error:', profileErr);
    }

    // Create fallback profile if database profile doesn't exist
    if (!profile) {
      profile = {
        id: authData.user.id,
        user_id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name || authData.user.email.split('@')[0],
        role: 'student',
        phone: null,
        country: null,
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at
      };
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed: !!authData.user.email_confirmed_at
      },
      profile: profile,
      session: authData.session,
      token: authData.session.access_token
    });

  } catch (error) {
    console.error('Login exception:', error);
    next(error);
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    // For JWT tokens (development mode), we don't need to do anything on the server
    // The client will remove the token from localStorage
    
    // Only try Supabase logout if user has Supabase session
    if (req.user && !req.user.id?.startsWith('mock-')) {
      try {
        await supabase.auth.signOut();
      } catch (supabaseError) {
        console.warn('Supabase logout failed (this is normal for JWT tokens):', supabaseError);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, we should return success so client can clear tokens
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

// @desc    Test endpoint for debugging token issues
// @route   GET /api/auth/test
// @access  Public  
router.get('/test', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.json({ 
        error: 'No token provided',
        message: 'Authorization header missing' 
      });
    }

    console.log('Test endpoint - Token received (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test Supabase connection
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.log('Test endpoint - Supabase error:', error);
      return res.json({
        success: false,
        supabase_error: error,
        token_preview: token.substring(0, 20) + '...'
      });
    }

    if (!user) {
      return res.json({
        success: false,
        error: 'User not found',
        token_preview: token.substring(0, 20) + '...'
      });
    }

    return res.json({
      success: true,
      user_id: user.id,
      user_email: user.email,
      user_metadata: user.user_metadata,
      token_preview: token.substring(0, 20) + '...'
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    res.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// @desc    Get current user (optimized to prevent hanging)
// @route   GET /api/auth/me
// @access  Private
router.get('/me', async (req, res) => {
  console.log('=== /me endpoint called ===');
  
  try {
    const authHeader = req.headers['authorization'];
    console.log('Authorization header received:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token extracted:', token ? `${token.substring(0, 20)}...` : 'None');

    if (!token) {
      console.log('❌ No token provided - returning 401');
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid access token' 
      });
    }

    console.log('✅ Token found, validating with Supabase...');
    
    // Verify the token with Supabase and get the real user
    const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !user) {
      console.error('❌ Token validation failed:', tokenError);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please login again'
      });
    }
    
    console.log('✅ Token validated, user ID:', user.id);
    
    try {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        return res.status(500).json({
          success: false,
          error: 'Could not fetch profile',
          message: profileError.message
        });
      }
      
      console.log('✅ Profile fetched from database:', profileData);
      
      const response = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          email_confirmed: true
        },
        profile: profileData
      };
      
      console.log('✅ Returning profile with role:', profileData.role);
      res.json(response);
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: dbError.message
      });
    }
    
  } catch (error) {
    console.error('❌ /me endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
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

// @desc    Confirm user email (development helper)
// @route   POST /api/auth/confirm-email-dev
// @access  Public
router.post('/confirm-email-dev', async (req, res, next) => {
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

    // Update user to confirmed
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('Error confirming user:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to confirm user email',
        details: updateError
      });
    }

    // Create or ensure profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Usuario',
          role: 'student',
          phone: null,
          country: null
        }])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return res.json({
      success: true,
      message: 'Email confirmed successfully and profile created',
      user: updatedUser.user
    });

  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Email confirmation failed'
    });
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
