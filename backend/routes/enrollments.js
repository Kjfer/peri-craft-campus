const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Enroll user in a course
// @route   POST /api/enrollments
// @access  Private
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    // Check if course exists and is active
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price')
      .eq('id', course_id)
      .eq('is_active', true)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found or inactive'
      });
    }

    // Check if user is already enrolled
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', course_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: checkError.message
      });
    }

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        error: 'You are already enrolled in this course'
      });
    }

    // For paid courses, check if payment exists
    if (course.price > 0) {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('course_id', course_id)
        .eq('payment_status', 'completed')
        .single();

      if (paymentError && paymentError.code !== 'PGRST116') {
        return res.status(400).json({
          success: false,
          error: paymentError.message
        });
      }

      if (!payment) {
        return res.status(402).json({
          success: false,
          error: 'Payment required for this course'
        });
      }
    }

    // Create enrollment
    const { data, error } = await supabase
      .from('enrollments')
      .insert([{
        user_id: req.user.id,
        course_id: course_id,
        progress_percentage: 0
      }])
      .select(`
        *,
        courses (
          id,
          title,
          description,
          instructor_name,
          thumbnail_url,
          category,
          level,
          duration_hours
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      enrollment: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user's enrollments
// @route   GET /api/enrollments
// @access  Private
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase
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

    // Filter by status
    if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    } else if (status === 'in_progress') {
      query = query.is('completed_at', null).gt('progress_percentage', 0);
    } else if (status === 'not_started') {
      query = query.eq('progress_percentage', 0);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      enrollments: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get enrollment by course ID
// @route   GET /api/enrollments/course/:courseId
// @access  Private
router.get('/course/:courseId', authenticateToken, async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          instructor_name,
          thumbnail_url,
          category,
          level,
          duration_hours
        )
      `)
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      enrollment: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update enrollment progress (Admin only)
// @route   PUT /api/enrollments/:id
// @access  Private (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progress_percentage, completed_at } = req.body;

    const updateData = {};
    if (progress_percentage !== undefined) {
      updateData.progress_percentage = Math.min(100, Math.max(0, parseInt(progress_percentage)));
    }
    if (completed_at !== undefined) {
      updateData.completed_at = completed_at;
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      message: 'Enrollment updated successfully',
      enrollment: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Cancel enrollment (soft delete)
// @route   DELETE /api/enrollments/:id
// @access  Private
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if enrollment belongs to user (non-admins can only cancel their own)
    let query = supabase
      .from('enrollments')
      .select('id, user_id')
      .eq('id', id);

    if (req.profile.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: enrollment, error: checkError } = await query.single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: checkError.message
      });
    }

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found or access denied'
      });
    }

    // For now, we'll actually delete the enrollment
    // In production, you might want to add a 'cancelled' status instead
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get enrollment statistics (Admin only)
// @route   GET /api/enrollments/stats
// @access  Private (Admin)
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { course_id, period = '30d' } = req.query;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    let query = supabase
      .from('enrollments')
      .select('*')
      .gte('enrolled_at', startDate.toISOString());

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    const { data: enrollments, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const stats = {
      total_enrollments: enrollments.length,
      completed: enrollments.filter(e => e.completed_at).length,
      in_progress: enrollments.filter(e => !e.completed_at && e.progress_percentage > 0).length,
      not_started: enrollments.filter(e => e.progress_percentage === 0).length,
      average_progress: enrollments.length > 0
        ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length)
        : 0,
      completion_rate: enrollments.length > 0
        ? Math.round((enrollments.filter(e => e.completed_at).length / enrollments.length) * 100)
        : 0
    };

    res.json({
      success: true,
      period,
      statistics: stats
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
