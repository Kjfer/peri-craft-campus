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

    const { data: cartItems, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id,
        course_id,
        added_at,
        courses:course_id (
          id,
          title,
          price,
          thumbnail_url,
          instructor_name,
          level,
          duration_hours
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Cart fetch error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const total = cartItems?.reduce((sum, item) => sum + (item.courses?.price || 0), 0) || 0;

    console.log('🛒 Cart items found:', cartItems?.length || 0);

    res.json({
      success: true,
      items: cartItems || [],
      total,
      count: cartItems?.length || 0
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

    // Check if already in cart
    const { data: existingItem } = await supabaseAdmin
      .from('cart_items')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', course_id)
      .single();

    if (existingItem) {
      console.log('Course already in cart');
      return res.status(400).json({
        success: false,
        error: 'Course already in cart'
      });
    }

    // Add to cart
    const { data: cartItem, error: insertError } = await supabaseAdmin
      .from('cart_items')
      .insert({
        user_id: userId,
        course_id: course_id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(400).json({
        success: false,
        error: insertError.message
      });
    }

    console.log('🛒 Course added to cart successfully:', cartItem);

    res.status(201).json({
      success: true,
      message: 'Course added to cart',
      item: cartItem
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

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Remove from cart error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('🛒 Course removed from cart successfully');

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

    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Clear cart error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('🛒 Cart cleared successfully');

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
