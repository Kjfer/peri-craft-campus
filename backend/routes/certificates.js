const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Verify certificate by code
// @route   GET /api/certificates/verify/:code
// @access  Public
router.get('/verify/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Certificate code is required'
      });
    }

    const { data, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name,
          duration_hours,
          category
        ),
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('certificate_code', code.toUpperCase())
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
        error: 'Certificate not found',
        is_valid: false
      });
    }

    // Check if certificate is valid
    const isValid = data.is_valid && new Date(data.issued_at) <= new Date();

    res.json({
      success: true,
      is_valid: isValid,
      certificate: isValid ? {
        code: data.certificate_code,
        issued_at: data.issued_at,
        student_name: data.profiles.full_name,
        course_title: data.courses.title,
        instructor_name: data.courses.instructor_name,
        duration_hours: data.courses.duration_hours,
        category: data.courses.category,
        certificate_url: data.certificate_url
      } : null,
      message: isValid ? 'Certificate is valid' : 'Certificate is not valid or has been revoked'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user's certificates
// @route   GET /api/certificates
// @access  Private
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name,
          duration_hours,
          category,
          thumbnail_url
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

// @desc    Get certificate by ID
// @route   GET /api/certificates/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = supabase
      .from('certificates')
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name,
          duration_hours,
          category,
          thumbnail_url
        ),
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id);

    // Non-admin users can only see their own certificates
    if (req.profile.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found or access denied'
      });
    }

    res.json({
      success: true,
      certificate: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Generate/Issue certificate for course completion
// @route   POST /api/certificates
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

    // Check if user completed the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id, progress_percentage, completed_at')
      .eq('user_id', req.user.id)
      .eq('course_id', course_id)
      .single();

    if (enrollmentError && enrollmentError.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: enrollmentError.message
      });
    }

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found. You must be enrolled in this course.'
      });
    }

    if (enrollment.progress_percentage < 100 || !enrollment.completed_at) {
      return res.status(400).json({
        success: false,
        error: 'Course must be completed to receive a certificate'
      });
    }

    // Check if certificate already exists
    const { data: existingCert, error: certCheckError } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', course_id)
      .single();

    if (certCheckError && certCheckError.code !== 'PGRST116') {
      return res.status(400).json({
        success: false,
        error: certCheckError.message
      });
    }

    if (existingCert) {
      return res.status(400).json({
        success: false,
        error: 'Certificate already exists for this course'
      });
    }

    // Generate certificate code
    const { data: certCode } = await supabase.rpc('generate_certificate_code');
    const certificateCode = certCode || `PERI-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create certificate
    const { data, error } = await supabase
      .from('certificates')
      .insert([{
        user_id: req.user.id,
        course_id: course_id,
        certificate_code: certificateCode,
        is_valid: true
      }])
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name,
          duration_hours,
          category
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
      message: 'Certificate generated successfully',
      certificate: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update certificate (Admin only)
// @route   PUT /api/certificates/:id
// @access  Private (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { certificate_url, is_valid } = req.body;

    const updateData = {};
    if (certificate_url !== undefined) updateData.certificate_url = certificate_url;
    if (is_valid !== undefined) updateData.is_valid = is_valid;

    const { data, error } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name
        ),
        profiles (
          id,
          full_name
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
        error: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Certificate updated successfully',
      certificate: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Revoke certificate (Admin only)
// @route   DELETE /api/certificates/:id
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Instead of deleting, mark as invalid
    const { data, error } = await supabase
      .from('certificates')
      .update({ is_valid: false })
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
        error: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      message: 'Certificate revoked successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get certificate statistics (Admin only)
// @route   GET /api/certificates/stats
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
      .from('certificates')
      .select('*')
      .gte('issued_at', startDate.toISOString());

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    const { data: certificates, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const stats = {
      total_issued: certificates.length,
      valid: certificates.filter(c => c.is_valid).length,
      revoked: certificates.filter(c => !c.is_valid).length,
      issued_this_month: certificates.filter(c => {
        const issueDate = new Date(c.issued_at);
        const thisMonth = new Date();
        return issueDate.getMonth() === thisMonth.getMonth() && 
               issueDate.getFullYear() === thisMonth.getFullYear();
      }).length
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

// @desc    Bulk generate certificates for course (Admin only)
// @route   POST /api/certificates/bulk/:courseId
// @access  Private (Admin)
router.post('/bulk/:courseId', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Get all completed enrollments for this course without certificates
    const { data: completedEnrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('progress_percentage', 100)
      .not('completed_at', 'is', null);

    if (enrollmentError) {
      return res.status(400).json({
        success: false,
        error: enrollmentError.message
      });
    }

    if (!completedEnrollments || completedEnrollments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed enrollments found for this course'
      });
    }

    const userIds = completedEnrollments.map(e => e.user_id);

    // Get existing certificates to avoid duplicates
    const { data: existingCerts } = await supabase
      .from('certificates')
      .select('user_id')
      .eq('course_id', courseId)
      .in('user_id', userIds);

    const existingUserIds = new Set((existingCerts || []).map(c => c.user_id));
    const newCertificates = [];

    for (const enrollment of completedEnrollments) {
      if (!existingUserIds.has(enrollment.user_id)) {
        const certificateCode = `PERI-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        newCertificates.push({
          user_id: enrollment.user_id,
          course_id: courseId,
          certificate_code: certificateCode,
          is_valid: true
        });
      }
    }

    if (newCertificates.length === 0) {
      return res.json({
        success: true,
        message: 'All eligible students already have certificates',
        certificates_created: 0
      });
    }

    // Insert new certificates
    const { data, error } = await supabase
      .from('certificates')
      .insert(newCertificates)
      .select();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: `Generated ${newCertificates.length} certificates successfully`,
      certificates_created: newCertificates.length,
      certificates: data
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
