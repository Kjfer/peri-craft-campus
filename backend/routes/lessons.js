const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// @desc    Get lessons by course ID
// @route   GET /api/lessons/course/:courseId
// @access  Public (but free lessons only for non-enrolled users)
router.get('/course/:courseId', async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const authHeader = req.headers['authorization'];
    let user = null;
    let isEnrolled = false;

    // Check if user is authenticated and enrolled
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser(token);
        user = authUser;

        if (user) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();

          isEnrolled = !!enrollment;
        }
      } catch (err) {
        // Token invalid, continue as non-authenticated user
      }
    }

    let query = supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_number', { ascending: true });

    // If user is not enrolled, only show free lessons or limited info
    if (!isEnrolled) {
      query = query.eq('is_free', true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // If not enrolled, remove video URLs from paid lessons
    let lessons = data || [];
    if (!isEnrolled) {
      lessons = lessons.map(lesson => ({
        ...lesson,
        video_url: lesson.is_free ? lesson.video_url : null
      }));
    }

    res.json({
      success: true,
      lessons,
      user_access: {
        is_enrolled: isEnrolled,
        can_view_all: isEnrolled
      }
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get lesson by ID with access control
// @route   GET /api/lessons/:id
// @access  Private (enrolled users only for paid lessons)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*, courses(id, title)')
      .eq('id', id)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }

    // Check if user has access to this lesson
    let hasAccess = lesson.is_free;

    if (!lesson.is_free) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('course_id', lesson.course_id)
        .single();

      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You need to enroll in this course to access this lesson'
      });
    }

    res.json({
      success: true,
      lesson
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create new lesson
// @route   POST /api/lessons
// @access  Private (Instructor/Admin)
router.post('/', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const {
      course_id,
      title,
      description,
      video_url,
      duration_minutes = 0,
      order_number,
      is_free = false
    } = req.body;

    if (!course_id || !title || !video_url || !order_number) {
      return res.status(400).json({
        success: false,
        error: 'Course ID, title, video URL, and order number are required'
      });
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    const { data, error } = await supabase
      .from('lessons')
      .insert([{
        course_id,
        title,
        description,
        video_url,
        duration_minutes: parseInt(duration_minutes),
        order_number: parseInt(order_number),
        is_free
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
      message: 'Lesson created successfully',
      lesson: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update lesson
// @route   PUT /api/lessons/:id
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
      .from('lessons')
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
        error: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      lesson: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Instructor/Admin)
router.delete('/:id', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('lessons')
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
      message: 'Lesson deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Mark lesson as watched/update progress
// @route   POST /api/lessons/:id/progress
// @access  Private
router.post('/:id/progress', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { watch_time_seconds = 0, completed = false } = req.body;

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('course_id, duration_minutes')
      .eq('id', id)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }

    // Check if user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', lesson.course_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({
        success: false,
        error: 'You must be enrolled in this course to track progress'
      });
    }

    // Update or insert progress
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('lesson_id', id)
      .single();

    let progressData;
    let error;

    if (existingProgress) {
      // Update existing progress
      ({ data: progressData, error } = await supabase
        .from('course_progress')
        .update({
          watch_time_seconds: parseInt(watch_time_seconds),
          completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', existingProgress.id)
        .select()
        .single());
    } else {
      // Create new progress record
      ({ data: progressData, error } = await supabase
        .from('course_progress')
        .insert([{
          user_id: req.user.id,
          lesson_id: id,
          watch_time_seconds: parseInt(watch_time_seconds),
          completed,
          completed_at: completed ? new Date().toISOString() : null
        }])
        .select()
        .single());
    }

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Update overall course progress
    await updateCourseProgress(req.user.id, lesson.course_id);

    res.json({
      success: true,
      message: 'Progress updated successfully',
      progress: progressData
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to update course progress
async function updateCourseProgress(userId, courseId) {
  try {
    // Get all lessons for the course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    if (!lessons || lessons.length === 0) return;

    // Get completed lessons for user
    const { data: completedLessons } = await supabase
      .from('course_progress')
      .select('id')
      .eq('user_id', userId)
      .in('lesson_id', lessons.map(l => l.id))
      .eq('completed', true);

    const progressPercentage = Math.round((completedLessons.length / lessons.length) * 100);
    const isCompleted = progressPercentage === 100;

    // Update enrollment progress
    await supabase
      .from('enrollments')
      .update({
        progress_percentage: progressPercentage,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('user_id', userId)
      .eq('course_id', courseId);

    // If course is completed, generate certificate
    if (isCompleted) {
      // Check if certificate already exists
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (!existingCert) {
        // Generate certificate code
        const { data: certCode } = await supabase.rpc('generate_certificate_code');
        
        await supabase
          .from('certificates')
          .insert([{
            user_id: userId,
            course_id: courseId,
            certificate_code: certCode || `PERI-${Date.now()}`,
            is_valid: true
          }]);
      }
    }

  } catch (error) {
    console.error('Error updating course progress:', error);
  }
}

module.exports = router;
