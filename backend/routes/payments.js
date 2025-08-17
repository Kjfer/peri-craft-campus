const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Import payment gateway routes
const mercadoPagoRoutes = require('./mercadopago');
const paypalRoutes = require('./paypal');
const googlePayRoutes = require('./googlepay');
const cardRoutes = require('./card');

// Mount payment gateway routes
router.use('/mercadopago', mercadoPagoRoutes);
router.use('/paypal', paypalRoutes);
router.use('/googlepay', googlePayRoutes);
router.use('/card', cardRoutes);

// Mock Stripe - In production, replace with actual Stripe integration
const mockStripe = {
  createPaymentIntent: (amount, currency) => {
    return Promise.resolve({
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      currency: currency,
      status: 'requires_payment_method'
    });
  },
  
  confirmPayment: (paymentIntentId) => {
    return Promise.resolve({
      id: paymentIntentId,
      status: 'succeeded',
      amount_received: Math.floor(Math.random() * 50000) + 5000, // Random amount between 50-500
      currency: 'usd'
    });
  }
};

// @desc    Create payment intent for course
// @route   POST /api/payments/create-intent/course
// @access  Private
router.post('/create-intent/course', authenticateToken, async (req, res, next) => {
  try {
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'Course ID is required'
      });
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price')
      .eq('id', course_id)
      .eq('is_active', true)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found or inactive'
      });
    }

    if (course.price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'This course is free and does not require payment'
      });
    }

    // Check if user already purchased this course
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('course_id', course_id)
      .eq('payment_status', 'completed')
      .single();

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: 'You have already purchased this course'
      });
    }

    // Create payment intent (mock)
    const paymentIntent = await mockStripe.createPaymentIntent(
      Math.round(course.price * 100), // Convert to cents
      'usd'
    );

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: req.user.id,
        course_id: course_id,
        amount: course.price,
        currency: 'USD',
        payment_method: 'card',
        payment_status: 'pending',
        external_payment_id: paymentIntent.id
      }])
      .select()
      .single();

    if (paymentError) {
      return res.status(400).json({
        success: false,
        error: paymentError.message
      });
    }

    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: course.price
      },
      payment_id: payment.id
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create payment intent for subscription
// @route   POST /api/payments/create-intent/subscription
// @access  Private
router.post('/create-intent/subscription', authenticateToken, async (req, res, next) => {
  try {
    const { subscription_id } = req.body;

    if (!subscription_id) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required'
      });
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('is_active', true)
      .single();

    if (subscriptionError || !subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found or inactive'
      });
    }

    // Create payment intent (mock)
    const paymentIntent = await mockStripe.createPaymentIntent(
      Math.round(subscription.price * 100), // Convert to cents
      'usd'
    );

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: req.user.id,
        subscription_id: subscription_id,
        amount: subscription.price,
        currency: 'USD',
        payment_method: 'card',
        payment_status: 'pending',
        external_payment_id: paymentIntent.id
      }])
      .select()
      .single();

    if (paymentError) {
      return res.status(400).json({
        success: false,
        error: paymentError.message
      });
    }

    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: subscription.price
      },
      payment_id: payment.id
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
router.post('/confirm', authenticateToken, async (req, res, next) => {
  try {
    const { payment_intent_id, payment_id } = req.body;

    if (!payment_intent_id || !payment_id) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID and payment ID are required'
      });
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', req.user.id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.payment_status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment already completed'
      });
    }

    // Confirm payment with Stripe (mock)
    const confirmedPayment = await mockStripe.confirmPayment(payment_intent_id);

    let updateData = {
      payment_status: confirmedPayment.status === 'succeeded' ? 'completed' : 'failed',
      updated_at: new Date().toISOString()
    };

    // Update payment record
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment_id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message
      });
    }

    // If payment successful, create enrollment for course
    if (confirmedPayment.status === 'succeeded' && payment.course_id) {
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert([{
          user_id: req.user.id,
          course_id: payment.course_id,
          progress_percentage: 0
        }]);

      if (enrollmentError) {
        console.error('Failed to create enrollment:', enrollmentError);
        // Payment succeeded but enrollment failed - this should be handled in production
      }
    }

    res.json({
      success: true,
      message: confirmedPayment.status === 'succeeded' ? 'Payment completed successfully' : 'Payment failed',
      payment: updatedPayment,
      payment_status: confirmedPayment.status
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get user's payment history
// @route   GET /api/payments
// @access  Private
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          thumbnail_url
        ),
        subscriptions (
          id,
          name
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('payment_status', status);
    }

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
      payments: data || [],
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

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          instructor_name,
          thumbnail_url
        ),
        subscriptions (
          id,
          name,
          description
        )
      `)
      .eq('id', id);

    // Non-admin users can only see their own payments
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
        error: 'Payment not found or access denied'
      });
    }

    res.json({
      success: true,
      payment: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Refund payment (Admin only)
// @route   POST /api/payments/:id/refund
// @access  Private (Admin)
router.post('/:id/refund', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Can only refund completed payments'
      });
    }

    // Update payment status
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message
      });
    }

    // If this was a course payment, remove enrollment
    if (payment.course_id) {
      await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', payment.user_id)
        .eq('course_id', payment.course_id);
    }

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      payment: updatedPayment
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get payment statistics (Admin only)
// @route   GET /api/payments/stats
// @access  Private (Admin)
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
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

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const completedPayments = (payments || []).filter(p => p.payment_status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    const stats = {
      total_payments: payments.length,
      completed_payments: completedPayments.length,
      pending_payments: payments.filter(p => p.payment_status === 'pending').length,
      failed_payments: payments.filter(p => p.payment_status === 'failed').length,
      refunded_payments: payments.filter(p => p.payment_status === 'refunded').length,
      total_revenue: totalRevenue,
      average_payment: completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0,
      success_rate: payments.length > 0 ? Math.round((completedPayments.length / payments.length) * 100) : 0
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

// @desc    Webhook endpoint for payment providers
// @route   POST /api/payments/webhook
// @access  Public (webhook)
router.post('/webhook', async (req, res, next) => {
  try {
    // This would handle webhooks from Stripe or other payment providers
    // For now, it's a placeholder
    const { event_type, payment_intent_id, status } = req.body;

    console.log('Webhook received:', { event_type, payment_intent_id, status });

    // Update payment status based on webhook
    if (payment_intent_id && status) {
      await supabase
        .from('payments')
        .update({
          payment_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('external_payment_id', payment_intent_id);
    }

    res.json({
      success: true,
      message: 'Webhook processed'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
