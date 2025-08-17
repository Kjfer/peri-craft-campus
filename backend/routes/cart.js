const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user's cart items
// @route   GET /api/cart
// @access  Private
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('🛒 Getting cart items for user:', userId);

    // Since cart_items table doesn't exist, return empty cart
    // Frontend will fallback to localStorage
    console.log('🛒 Cart table not available, returning empty cart for localStorage fallback');

    res.json({
      success: true,
      items: [],
      total: 0,
      count: 0
    });

  } catch (error) {
    console.error('Cart route error:', error);
    next(error);
  }
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { course_id } = req.body;

    console.log('🛒 Adding course to cart:', { userId, course_id });

    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    // Check if course exists and is active
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, price, is_active')
      .eq('id', course_id)
      .eq('is_active', true)
      .single();

    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return res.status(404).json({
        success: false,
        error: 'Course not found or not active'
      });
    }

    // Check if user is already enrolled
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', course_id)
      .single();

    if (enrollment) {
      console.log('User already enrolled in course');
      return res.status(400).json({
        success: false,
        error: 'Already enrolled in this course'
      });
    }

    // Since cart_items table doesn't exist, just validate and return success
    // Frontend will handle localStorage
    console.log('🛒 Course validation passed, using localStorage fallback');

    res.status(201).json({
      success: true,
      message: 'Course added to cart',
      item: {
        id: `cart_${Date.now()}_${course_id}`,
        user_id: userId,
        course_id: course_id,
        added_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    next(error);
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:courseId
// @access  Private
router.delete('/:courseId', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    console.log('🛒 Removing course from cart:', { userId, courseId });

    // Since cart_items table doesn't exist, just return success
    // Frontend will handle localStorage
    console.log('🛒 Course removed from cart (localStorage fallback)');

    res.json({
      success: true,
      message: 'Item removed from cart'
    });

  } catch (error) {
    console.error('Remove from cart route error:', error);
    next(error);
  }
});

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
router.delete('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    console.log('🛒 Clearing cart for user:', userId);

    // Since cart_items table doesn't exist, just return success
    // Frontend will handle localStorage
    console.log('🛒 Cart cleared (localStorage fallback)');

    res.json({
      success: true,
      message: 'Cart cleared'
    });

  } catch (error) {
    console.error('Clear cart route error:', error);
    next(error);
  }
});

module.exports = router;
