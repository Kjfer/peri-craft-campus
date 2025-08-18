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

    // Cart is handled by frontend localStorage for better performance
    // Backend validates on checkout when creating orders
    console.log('🛒 Using localStorage-based cart for better UX');

    res.json({
      success: true,
      items: [],
      total: 0,
      count: 0,
      message: 'Cart handled by frontend localStorage'
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

    // Validate course and enrollment status - this is important!
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
        error: 'Curso no encontrado o no activo'
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
        error: 'Ya estás inscrito en este curso. Puedes acceder desde tu dashboard.',
        enrolled: true
      });
    }

    // Check if there's a pending order for this course
    const { data: pendingOrder } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_items!inner(course_id),
        payments(payment_status)
      `)
      .eq('user_id', userId)
      .eq('order_items.course_id', course_id)
      .in('payments.payment_status', ['pending', 'processing'])
      .limit(1);

    if (pendingOrder && pendingOrder.length > 0) {
      console.log('User has pending order for this course');
      return res.status(400).json({
        success: false,
        error: 'Ya tienes una orden pendiente para este curso. Completa el pago para continuar.',
        pending: true,
        orderId: pendingOrder[0].id
      });
    }

    // Course is valid and user not enrolled - frontend handles localStorage cart
    console.log('🛒 Course validation passed for cart addition');

    res.status(201).json({
      success: true,
      message: 'Curso validado para el carrito',
      course: {
        id: course.id,
        title: course.title,
        price: course.price
      },
      item: {
        id: `cart_${Date.now()}_${course_id}`,
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

    // Cart is handled by frontend localStorage
    // Backend just confirms the operation
    console.log('🛒 Course removal confirmed (localStorage handled by frontend)');

    res.json({
      success: true,
      message: 'Item removal confirmed'
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

    // Cart is handled by frontend localStorage
    // Backend confirms the clear operation
    console.log('🛒 Cart clear confirmed (localStorage handled by frontend)');

    res.json({
      success: true,
      message: 'Cart clear confirmed'
    });

  } catch (error) {
    console.error('Clear cart route error:', error);
    next(error);
  }
});

module.exports = router;
