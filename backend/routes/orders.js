const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          course_id,
          course_title,
          course_price
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// @desc    Create new order from cart
// @route   POST /api/orders
// @access  Private
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { payment_method = 'card', payment_data = {} } = req.body;

    // Get cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        id,
        course_id,
        courses:course_id (
          id,
          title,
          price,
          is_active
        )
      `)
      .eq('user_id', userId);

    if (cartError) {
      return res.status(400).json({
        success: false,
        error: cartError.message
      });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Calculate total
    const activeItems = cartItems.filter(item => item.courses?.is_active);
    const totalAmount = activeItems.reduce((sum, item) => sum + (item.courses?.price || 0), 0);

    if (totalAmount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid courses in cart'
      });
    }

    // Create order using supabaseAdmin to bypass RLS
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        payment_method,
        payment_status: 'pending',
        external_payment_id: payment_data.transaction_id || `sim_${Date.now()}`,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(400).json({
        success: false,
        error: 'Failed to create order'
      });
    }

    // Create order items
    const orderItems = activeItems.map(item => ({
      order_id: order.id,
      course_id: item.course_id,
      course_title: item.courses.title,
      course_price: item.courses.price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Try to cleanup the order
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return res.status(400).json({
        success: false,
        error: 'Failed to create order items'
      });
    }

    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Update order status to completed
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'completed' })
          .eq('id', order.id);

        // Auto-enroll user in courses
        const enrollments = activeItems.map(item => ({
          user_id: userId,
          course_id: item.course_id,
        }));

        await supabaseAdmin
          .from('enrollments')
          .insert(enrollments);

        // Clear cart
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId);

        console.log(`✅ Order ${order.order_number} completed and user enrolled`);
      } catch (error) {
        console.error('Error completing order:', error);
      }
    }, 2000); // Simulate 2-second processing

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        created_at: order.created_at
      }
    });

  } catch (error) {
    console.error('Unexpected error creating order:', error);
    next(error);
  }
});

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        currency,
        payment_status,
        payment_method,
        created_at,
        updated_at,
        order_items (
          id,
          course_id,
          course_title,
          course_price,
          courses:course_id (
            id,
            title,
            thumbnail_url,
            instructor_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get specific order
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        currency,
        payment_status,
        payment_method,
        external_payment_id,
        created_at,
        updated_at,
        order_items (
          id,
          course_id,
          course_title,
          course_price,
          courses:course_id (
            id,
            title,
            thumbnail_url,
            instructor_name,
            level,
            duration_hours
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
router.put('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    // Check if user is admin (simplified check)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        payment_status,
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

    res.json({
      success: true,
      message: 'Order status updated',
      order
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
