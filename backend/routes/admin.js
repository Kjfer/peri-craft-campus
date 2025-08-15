const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // Get various statistics in parallel
    const [
      coursesResult,
      usersResult,
      enrollmentsResult,
      paymentsResult,
      certificatesResult
    ] = await Promise.all([
      // Total courses
      supabase.from('courses').select('id', { count: 'exact' }).eq('is_active', true),
      
      // Total users
      supabase.from('profiles').select('id', { count: 'exact' }),
      
      // Recent enrollments
      supabase.from('enrollments').select('id', { count: 'exact' }).gte('enrolled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Revenue this month
      supabase.from('payments').select('amount').eq('payment_status', 'completed').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // Certificates issued
      supabase.from('certificates').select('id', { count: 'exact' }).eq('is_valid', true)
    ]);

    const totalRevenue = (paymentsResult.data || []).reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    const stats = {
      total_courses: coursesResult.count || 0,
      total_users: usersResult.count || 0,
      recent_enrollments: enrollmentsResult.count || 0,
      monthly_revenue: totalRevenue,
      certificates_issued: certificatesResult.count || 0
    };

    // Get recent activities
    const { data: recentEnrollments } = await supabase
      .from('enrollments')
      .select(`
        enrolled_at,
        courses (title),
        profiles (full_name)
      `)
      .order('enrolled_at', { ascending: false })
      .limit(5);

    const { data: recentCertificates } = await supabase
      .from('certificates')
      .select(`
        issued_at,
        certificate_code,
        courses (title),
        profiles (full_name)
      `)
      .order('issued_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      statistics: stats,
      recent_activities: {
        enrollments: recentEnrollments || [],
        certificates: recentCertificates || []
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get all users with pagination and filters
// @route   GET /api/admin/users
// @access  Private (Admin)
router.get('/users', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { 
      role, 
      search, 
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      order = 'desc'
    } = req.query;

    let query = supabase
      .from('profiles')
      .select('*');

    // Apply filters
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%, email.ilike.%${search}%`);
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
      users: data || [],
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

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['student', 'admin', 'instructor'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Valid role is required (student, admin, instructor)'
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role,
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
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete user account (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user profile to get user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete user from auth (this will cascade to profiles due to foreign key)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get all courses for admin management
// @route   GET /api/admin/courses
// @access  Private (Admin)
router.get('/courses', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { 
      category, 
      status, 
      search, 
      page = 1, 
      limit = 20,
      sort_by = 'created_at',
      order = 'desc'
    } = req.query;

    let query = supabase
      .from('courses')
      .select('*');

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, instructor_name.ilike.%${search}%`);
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

// @desc    Toggle course featured status
// @route   PUT /api/admin/courses/:id/featured
// @access  Private (Admin)
router.put('/courses/:id/featured', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    const { data, error } = await supabase
      .from('courses')
      .update({ 
        featured: Boolean(featured),
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
      message: `Course ${featured ? 'featured' : 'unfeatured'} successfully`,
      course: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get detailed course statistics
// @route   GET /api/admin/courses/:id/detailed-stats
// @access  Private (Admin)
router.get('/courses/:id/detailed-stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get enrollment statistics
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('progress_percentage, completed_at, enrolled_at')
      .eq('course_id', id);

    if (enrollmentError) {
      return res.status(400).json({
        success: false,
        error: enrollmentError.message
      });
    }

    // Get payment statistics
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, payment_status, created_at')
      .eq('course_id', id);

    if (paymentsError) {
      return res.status(400).json({
        success: false,
        error: paymentsError.message
      });
    }

    // Get certificate statistics
    const { data: certificates, error: certificatesError } = await supabase
      .from('certificates')
      .select('issued_at')
      .eq('course_id', id)
      .eq('is_valid', true);

    if (certificatesError) {
      return res.status(400).json({
        success: false,
        error: certificatesError.message
      });
    }

    const completedPayments = (payments || []).filter(p => p.payment_status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    const stats = {
      enrollments: {
        total: enrollments.length,
        completed: enrollments.filter(e => e.completed_at).length,
        average_progress: enrollments.length > 0 
          ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length)
          : 0
      },
      payments: {
        total: payments.length,
        completed: completedPayments.length,
        revenue: totalRevenue
      },
      certificates: {
        issued: certificates.length
      }
    };

    res.json({
      success: true,
      statistics: stats
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get system analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
router.get('/analytics', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;

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

    // Get analytics data
    const [
      enrollmentsResult,
      paymentsResult,
      certificatesResult,
      usersResult
    ] = await Promise.all([
      supabase.from('enrollments').select('enrolled_at').gte('enrolled_at', startDate.toISOString()),
      supabase.from('payments').select('amount, created_at').eq('payment_status', 'completed').gte('created_at', startDate.toISOString()),
      supabase.from('certificates').select('issued_at').gte('issued_at', startDate.toISOString()),
      supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString())
    ]);

    const analytics = {
      enrollments: {
        total: enrollmentsResult.data?.length || 0,
        data: enrollmentsResult.data || []
      },
      revenue: {
        total: (paymentsResult.data || []).reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
        data: paymentsResult.data || []
      },
      certificates: {
        total: certificatesResult.data?.length || 0,
        data: certificatesResult.data || []
      },
      users: {
        total: usersResult.data?.length || 0,
        data: usersResult.data || []
      }
    };

    res.json({
      success: true,
      period,
      analytics
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Send system notification to all users
// @route   POST /api/admin/notifications
// @access  Private (Admin)
router.post('/notifications', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { title, message, target_role = 'all' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // In a real application, you would implement a notification system
    // For now, we'll just return success
    res.json({
      success: true,
      message: `Notification sent to ${target_role === 'all' ? 'all users' : target_role + ' users'}`,
      notification: {
        title,
        message,
        target_role,
        sent_at: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Export data (users, courses, etc.)
// @route   GET /api/admin/export/:type
// @access  Private (Admin)
router.get('/export/:type', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data = null;
    let filename = '';

    switch (type) {
      case 'users':
        const { data: users } = await supabase.from('profiles').select('*');
        data = users;
        filename = 'users';
        break;
      
      case 'courses':
        const { data: courses } = await supabase.from('courses').select('*');
        data = courses;
        filename = 'courses';
        break;
      
      case 'enrollments':
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            *,
            courses (title),
            profiles (full_name, email)
          `);
        data = enrollments;
        filename = 'enrollments';
        break;
      
      case 'payments':
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            *,
            courses (title),
            profiles (full_name, email)
          `);
        data = payments;
        filename = 'payments';
        break;
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // In a real application, you would convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.csv`);
      res.send('CSV export not implemented yet');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}-${Date.now()}.json`);
      res.json({
        success: true,
        export_type: type,
        exported_at: new Date().toISOString(),
        count: data?.length || 0,
        data: data || []
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
