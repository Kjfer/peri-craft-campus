const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all active courses with filtering
// @route   GET /api/courses
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    // Temporary mock data while fixing RLS issues
    const mockCourses = [
      {
        id: '1',
        title: 'Diseño de Moda para Principiantes',
        description: 'Aprende los fundamentos del diseño de moda desde cero. Este curso te enseñará las técnicas básicas de ilustración, patrones y confección.',
        short_description: 'Fundamentos del diseño de moda',
        category: 'Diseño',
        level: 'beginner',
        price: 99.99,
        thumbnail_url: '/placeholder.svg',
        instructor_name: 'María González',
        duration_hours: 20,
        featured: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Confección Avanzada de Vestidos',
        description: 'Domina las técnicas avanzadas de confección para crear vestidos elegantes y profesionales.',
        short_description: 'Técnicas avanzadas de confección',
        category: 'Confección',
        level: 'advanced',
        price: 199.99,
        thumbnail_url: '/placeholder.svg',
        instructor_name: 'Carmen Silva',
        duration_hours: 35,
        featured: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Patronaje Industrial',
        description: 'Aprende las técnicas de patronaje utilizadas en la industria textil moderna.',
        short_description: 'Patronaje para la industria',
        category: 'Patronaje',
        level: 'intermediate',
        price: 149.99,
        thumbnail_url: '/placeholder.svg',
        instructor_name: 'Roberto Mendez',
        duration_hours: 28,
        featured: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    let filteredCourses = [...mockCourses];
    
    // Apply filters
    const { category, level, search, featured } = req.query;
    
    if (category && category !== 'all') {
      filteredCourses = filteredCourses.filter(course => course.category === category);
    }

    if (level && level !== 'all') {
      filteredCourses = filteredCourses.filter(course => course.level === level);
    }

    if (featured === 'true') {
      filteredCourses = filteredCourses.filter(course => course.featured === true);
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      filteredCourses = filteredCourses.filter(course =>
        course.title.toLowerCase().includes(searchTerm) ||
        course.description.toLowerCase().includes(searchTerm) ||
        course.instructor_name.toLowerCase().includes(searchTerm)
      );
    }

    res.json({
      success: true,
      courses: filteredCourses,
      count: filteredCourses.length,
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        total: filteredCourses.length
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

    // Mock course detail for now
    const mockCourse = {
      id: id,
      title: 'Diseño de Moda para Principiantes',
      description: 'Aprende los fundamentos del diseño de moda desde cero. Este curso te enseñará las técnicas básicas de ilustración, patrones y confección.',
      short_description: 'Fundamentos del diseño de moda',
      category: 'Diseño',
      level: 'beginner',
      price: 99.99,
      thumbnail_url: '/placeholder.svg',
      instructor_name: 'María González',
      duration_hours: 20,
      featured: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lessons: [
        {
          id: '1',
          title: 'Introducción al diseño de moda',
          description: 'Conceptos básicos y historia',
          duration_minutes: 45,
          order: 1
        }
      ]
    };

    res.json({
      success: true,
      course: mockCourse
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
