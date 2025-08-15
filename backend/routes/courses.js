const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all active courses with filtering
// @route   GET /api/courses
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { 
      category, 
      level, 
      search, 
      featured, 
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      order = 'desc'
    } = req.query;

    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_active', true);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%, instructor_name.ilike.%${search}%`);
    }

    // Apply sorting
    const ascending = order === 'asc';
    query = query.order(sort_by, { ascending });

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
      courses: data || [],
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

// @desc    Get course by ID with lessons
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Get course lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, description, duration_minutes, order_number, is_free')
      .eq('course_id', id)
      .order('order_number', { ascending: true });

    if (lessonsError) {
      return res.status(400).json({
        success: false,
        error: lessonsError.message
      });
    }

    res.json({
      success: true,
      course: {
        ...course,
        lessons: lessons || []
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Instructor/Admin)
router.post('/', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const {
      title,
      description,
      short_description,
      instructor_name,
      thumbnail_url,
      category,
      level = 'Principiante',
      duration_hours = 0,
      price = 0,
      requirements = [],
      what_you_learn = [],
      featured = false
    } = req.body;

    if (!title || !description || !instructor_name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, instructor name, and category are required'
      });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert([{
        title,
        description,
        short_description,
        instructor_name,
        thumbnail_url,
        category,
        level,
        duration_hours: parseInt(duration_hours),
        price: parseFloat(price),
        requirements,
        what_you_learn,
        featured,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Instructor/Admin)
router.put('/:id', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    updateData.updated_at = new Date().toISOString();

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;

    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
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
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      course: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete course (soft delete)
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('courses')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
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
        error: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course deactivated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get course statistics
// @route   GET /api/courses/:id/stats
// @access  Private (Instructor/Admin)
router.get('/:id/stats', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get enrollment count
    const { count: enrollmentCount, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('course_id', id);

    if (enrollmentError) {
      return res.status(400).json({
        success: false,
        error: enrollmentError.message
      });
    }

    // Get completion count
    const { count: completionCount, error: completionError } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('course_id', id)
      .not('completed_at', 'is', null);

    if (completionError) {
      return res.status(400).json({
        success: false,
        error: completionError.message
      });
    }

    // Get average progress
    const { data: progressData, error: progressError } = await supabase
      .from('enrollments')
      .select('progress_percentage')
      .eq('course_id', id);

    if (progressError) {
      return res.status(400).json({
        success: false,
        error: progressError.message
      });
    }

    const averageProgress = progressData.length > 0
      ? progressData.reduce((sum, enrollment) => sum + enrollment.progress_percentage, 0) / progressData.length
      : 0;

    // Get certificate count
    const { count: certificateCount, error: certificateError } = await supabase
      .from('certificates')
      .select('id', { count: 'exact' })
      .eq('course_id', id)
      .eq('is_valid', true);

    if (certificateError) {
      return res.status(400).json({
        success: false,
        error: certificateError.message
      });
    }

    // Get revenue
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('course_id', id)
      .eq('payment_status', 'completed');

    if (paymentsError) {
      return res.status(400).json({
        success: false,
        error: paymentsError.message
      });
    }

    const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    res.json({
      success: true,
      statistics: {
        enrollments: enrollmentCount || 0,
        completions: completionCount || 0,
        completion_rate: enrollmentCount > 0 ? Math.round((completionCount / enrollmentCount) * 100) : 0,
        average_progress: Math.round(averageProgress),
        certificates_issued: certificateCount || 0,
        total_revenue: totalRevenue
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get course categories
// @route   GET /api/courses/meta/categories
// @access  Public
router.get('/meta/categories', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('category')
      .eq('is_active', true);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const categories = [...new Set(data.map(course => course.category))].sort();

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
