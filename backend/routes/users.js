const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    // Expose yape_number: prefer DB value, fallback to env var or null
    const profileWithYape = {
      ...req.profile,
      yape_number: req.profile?.yape_number || process.env.YAPE_NUMBER || null
    };

    res.json({
      success: true,
      profile: profileWithYape
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
  const { full_name, phone, country, avatar_url, yape_number } = req.body;
    
    console.log('Updating profile for user:', req.user.id);
    console.log('Update data:', { full_name, phone, country, avatar_url });
    
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
  if (yape_number !== undefined) updateData.yape_number = yape_number;
    updateData.updated_at = new Date().toISOString();

    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    let result;
    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Profile does not exist, creating new one...');
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert([{
          user_id: req.user.id,
          email: req.user.email,
      ...updateData,
          role: 'student'
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating profile:', error);
        return res.status(400).json({
          success: false,
          error: error.message,
          details: error
        });
      }
      result = data;
    } else if (checkError) {
      console.error('Error checking profile:', checkError);
      return res.status(400).json({
        success: false,
        error: checkError.message,
        details: checkError
      });
    } else {
      // Profile exists, update it
      console.log('Profile exists, updating...');
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return res.status(400).json({
          success: false,
          error: error.message,
          details: error
        });
      }
      result = data;
    }

    console.log('Profile operation successful:', result);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: result
    });

  } catch (error) {
    console.error('Profile update exception:', error);
    next(error);
  }
});

// @desc    Get user enrollments with progress
// @route   GET /api/users/enrollments
// @access  Private
router.get('/enrollments', authenticateToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          short_description,
          instructor_name,
          thumbnail_url,
          category,
          level,
          duration_hours,
          price
        )
      `)
      .eq('user_id', req.user.id)
      .order('enrolled_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      enrollments: data || []
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user certificates
// @route   GET /api/users/certificates
// @access  Private
router.get('/certificates', authenticateToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name,
          duration_hours
        )
      `)
      .eq('user_id', req.user.id)
      .eq('is_valid', true)
      .order('issued_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      certificates: data || []
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user learning progress
// @route   GET /api/users/progress
// @access  Private
router.get('/progress', authenticateToken, async (req, res, next) => {
  try {
    // Get course progress
    const { data: progressData, error: progressError } = await supabase
      .from('course_progress')
      .select(`
        *,
        lessons (
          id,
          title,
          course_id,
          duration_minutes,
          courses (
            id,
            title
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('completed_at', { ascending: false });

    if (progressError) {
      return res.status(400).json({
        success: false,
        error: progressError.message
      });
    }

    // Get enrollment statistics
    const { data: enrollmentStats, error: statsError } = await supabase
      .from('enrollments')
      .select('id, progress_percentage, completed_at')
      .eq('user_id', req.user.id);

    if (statsError) {
      return res.status(400).json({
        success: false,
        error: statsError.message
      });
    }

    const totalEnrollments = enrollmentStats.length;
    const completedCourses = enrollmentStats.filter(e => e.completed_at).length;
    const averageProgress = enrollmentStats.length > 0 
      ? enrollmentStats.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollmentStats.length
      : 0;

    res.json({
      success: true,
      progress: {
        lessons: progressData || [],
        statistics: {
          total_enrollments: totalEnrollments,
          completed_courses: completedCourses,
          average_progress: Math.round(averageProgress),
          completion_rate: totalEnrollments > 0 ? Math.round((completedCourses / totalEnrollments) * 100) : 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user payment history
// @route   GET /api/users/payments
// @access  Private
router.get('/payments', authenticateToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title
        ),
        subscriptions (
          id,
          name
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      payments: data || []
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
router.put('/password', authenticateToken, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Verify current password by trying to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password
    });

    if (verifyError) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
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

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete('/account', authenticateToken, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    // Verify password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: password
    });

    if (verifyError) {
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect'
      });
    }

    // Soft delete profile (mark as inactive)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id);

    if (profileError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to deactivate profile'
      });
    }

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
