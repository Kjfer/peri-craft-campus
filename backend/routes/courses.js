const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken, requireInstructor, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all active courses with filtering
// @route   GET /api/courses
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    // Get real data from database using supabaseAdmin to bypass RLS
    const { data: coursesData, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return res.status(400).json({
        success: false,
        error: coursesError.message
      });
    }

    let filteredCourses = coursesData || [];
    
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
    console.log(`🔍 Fetching course with ID: ${id}`);

    // Get course from database using supabaseAdmin to bypass RLS
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select(`
        id,
        title,
        description,
        short_description,
        category,
        level,
        price,
        thumbnail_url,
        instructor_name,
        duration_hours,
        featured,
        is_active,
        requirements,
        what_you_learn,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    console.log(`📊 Course query result:`, { course, error: courseError });

    if (courseError) {
      console.log(`❌ Course error: ${courseError.code} - ${courseError.message}`);
      if (courseError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }
      return res.status(400).json({
        success: false,
        error: courseError.message
      });
    }

    console.log(`✅ Course found: ${course.title}`);

    // Get modules for this course with their lessons using supabaseAdmin to bypass RLS
    const { data: modules, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select(`
        id,
        title,
        description,
        order_number,
        lessons (
          id,
          title,
          description,
          duration_minutes,
          order_number,
          is_free,
          video_url,
          content
        )
      `)
      .eq('course_id', id)
      .order('order_number', { ascending: true });

    if (modulesError) {
      console.warn('Error fetching modules:', modulesError.message);
    }

    console.log(`📚 Found ${modules?.length || 0} modules for course`);

    // Return simplified response without complex statistics for now
    const courseWithModules = {
      ...course,
      modules: modules || []
    };

    console.log(`✅ Returning course data successfully`);
    res.json({
      success: true,
      course: courseWithModules
    });

  } catch (error) {
    console.error('❌ Unexpected error in course endpoint:', error);
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
      featured = false,
      modules = []
    } = req.body;

    if (!title || !description || !instructor_name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, instructor name, and category are required'
      });
    }

    console.log(`🔄 Creating course with ${modules.length} modules`);

    // First, create the course
    const { data: courseData, error: courseError } = await supabaseAdmin
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

    if (courseError) {
      console.error('❌ Error creating course:', courseError);
      return res.status(400).json({
        success: false,
        error: courseError.message
      });
    }

    console.log(`✅ Course created with ID: ${courseData.id}`);

    // Create modules if provided
    const createdModules = [];
    if (modules && modules.length > 0) {
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        console.log(`🔄 Creating module ${i + 1}: ${module.title}`);
        
        // Create the module
        const { data: moduleData, error: moduleError } = await supabaseAdmin
          .from('modules')
          .insert([{
            course_id: courseData.id,
            title: module.title,
            description: module.description || '',
            order_number: i + 1
          }])
          .select()
          .single();

        if (moduleError) {
          console.error('❌ Error creating module:', moduleError);
          // Continue with other modules even if one fails
          continue;
        }

        console.log(`✅ Module created with ID: ${moduleData.id}`);

        // Create lessons for this module
        const createdLessons = [];
        if (module.lessons && module.lessons.length > 0) {
          for (let j = 0; j < module.lessons.length; j++) {
            const lesson = module.lessons[j];
            console.log(`🔄 Creating lesson ${j + 1} for module ${moduleData.id}: ${lesson.title}`);
            
            const { data: lessonData, error: lessonError } = await supabaseAdmin
              .from('lessons')
              .insert([{
                course_id: courseData.id,  // ✅ Add course_id relationship
                module_id: moduleData.id,
                title: lesson.title,
                description: lesson.description || '',
                content: lesson.content || '',
                video_url: lesson.video_url || null,
                duration_minutes: lesson.duration_minutes || 0,
                order_number: j + 1,
                is_free: lesson.is_free || false
              }])
              .select()
              .single();

            if (lessonError) {
              console.error('❌ Error creating lesson:', lessonError);
              continue;
            }

            console.log(`✅ Lesson created with ID: ${lessonData.id}`);
            createdLessons.push(lessonData);
          }
        }

        createdModules.push({
          ...moduleData,
          lessons: createdLessons
        });
      }
    }

    const courseWithModules = {
      ...courseData,
      modules: createdModules
    };

    console.log(`✅ Course created successfully with ${createdModules.length} modules`);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: courseWithModules
    });

  } catch (error) {
    console.error('❌ Unexpected error creating course:', error);
    next(error);
  }
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Instructor/Admin)
router.put('/:id', authenticateToken, requireInstructor, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { modules = [], ...courseData } = req.body;
    courseData.updated_at = new Date().toISOString();

    // Remove fields that shouldn't be updated directly
    delete courseData.id;
    delete courseData.created_at;

    console.log(`🔄 Updating course ${id} with ${modules.length} modules`);

    // First, update the course
    const { data: courseUpdateData, error: courseError } = await supabaseAdmin
      .from('courses')
      .update(courseData)
      .eq('id', id)
      .select()
      .single();

    if (courseError) {
      console.error('❌ Error updating course:', courseError);
      return res.status(400).json({
        success: false,
        error: courseError.message
      });
    }

    if (!courseUpdateData) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    console.log(`✅ Course updated successfully`);

    // Handle modules update if provided
    let updatedModules = [];
    if (modules && modules.length > 0) {
      // First, get existing modules to know which ones to delete
      const { data: existingModules } = await supabaseAdmin
        .from('modules')
        .select('id')
        .eq('course_id', id);

      // Delete existing modules and their lessons (cascade should handle lessons)
      if (existingModules && existingModules.length > 0) {
        console.log(`🔄 Deleting ${existingModules.length} existing modules`);
        
        // First delete lessons
        for (const existingModule of existingModules) {
          await supabaseAdmin
            .from('lessons')
            .delete()
            .eq('module_id', existingModule.id);
        }
        
        // Then delete modules
        await supabaseAdmin
          .from('modules')
          .delete()
          .eq('course_id', id);
      }

      // Create new modules with lessons
      for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        console.log(`🔄 Creating/updating module ${i + 1}: ${module.title}`);
        
        // Create the module
        const { data: moduleData, error: moduleError } = await supabaseAdmin
          .from('modules')
          .insert([{
            course_id: id,
            title: module.title,
            description: module.description || '',
            order_number: i + 1
          }])
          .select()
          .single();

        if (moduleError) {
          console.error('❌ Error creating module:', moduleError);
          continue;
        }

        console.log(`✅ Module created with ID: ${moduleData.id}`);

        // Create lessons for this module
        const createdLessons = [];
        if (module.lessons && module.lessons.length > 0) {
          for (let j = 0; j < module.lessons.length; j++) {
            const lesson = module.lessons[j];
            console.log(`🔄 Creating lesson ${j + 1} for module ${moduleData.id}: ${lesson.title}`);
            
            const { data: lessonData, error: lessonError } = await supabaseAdmin
              .from('lessons')
              .insert([{
                course_id: id,  // ✅ Add course_id relationship
                module_id: moduleData.id,
                title: lesson.title,
                description: lesson.description || '',
                content: lesson.content || '',
                video_url: lesson.video_url || null,
                duration_minutes: lesson.duration_minutes || 0,
                order_number: j + 1,
                is_free: lesson.is_free || false
              }])
              .select()
              .single();

            if (lessonError) {
              console.error('❌ Error creating lesson:', lessonError);
              continue;
            }

            console.log(`✅ Lesson created with ID: ${lessonData.id}`);
            createdLessons.push(lessonData);
          }
        }

        updatedModules.push({
          ...moduleData,
          lessons: createdLessons
        });
      }
    }

    const courseWithModules = {
      ...courseUpdateData,
      modules: updatedModules
    };

    console.log(`✅ Course updated successfully with ${updatedModules.length} modules`);

    res.json({
      success: true,
      message: 'Course updated successfully',
      course: courseWithModules
    });

  } catch (error) {
    console.error('❌ Unexpected error updating course:', error);
    next(error);
  }
});

// @desc    Delete course (soft delete)
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
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
