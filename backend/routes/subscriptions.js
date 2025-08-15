const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all subscription plans
// @route   GET /api/subscriptions
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { active_only = true } = req.query;

    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('price', { ascending: true });

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      subscriptions: data || []
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
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
        error: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      subscription: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Create new subscription plan
// @route   POST /api/subscriptions
// @access  Private (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      duration_months,
      features = [],
      is_active = true
    } = req.body;

    if (!name || !description || !price || !duration_months) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, price, and duration are required'
      });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{
        name,
        description,
        price: parseFloat(price),
        duration_months: parseInt(duration_months),
        features,
        is_active
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
      message: 'Subscription plan created successfully',
      subscription: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Update subscription plan
// @route   PUT /api/subscriptions/:id
// @access  Private (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    updateData.updated_at = new Date().toISOString();

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }

    if (updateData.duration_months) {
      updateData.duration_months = parseInt(updateData.duration_months);
    }

    const { data, error } = await supabase
      .from('subscriptions')
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
        error: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      subscription: data
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Delete subscription plan (soft delete)
// @route   DELETE /api/subscriptions/:id
// @access  Private (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('subscriptions')
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
        error: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription plan deactivated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Get subscription statistics (Admin only)
// @route   GET /api/subscriptions/stats
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

    // Get payments for subscriptions
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        amount,
        payment_status,
        created_at,
        subscriptions (
          id,
          name,
          price
        )
      `)
      .not('subscription_id', 'is', null)
      .gte('created_at', startDate.toISOString());

    if (paymentsError) {
      return res.status(400).json({
        success: false,
        error: paymentsError.message
      });
    }

    const completedPayments = (payments || []).filter(p => p.payment_status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    const stats = {
      total_subscriptions_sold: completedPayments.length,
      total_revenue: totalRevenue,
      pending_payments: (payments || []).filter(p => p.payment_status === 'pending').length,
      failed_payments: (payments || []).filter(p => p.payment_status === 'failed').length,
      average_subscription_value: completedPayments.length > 0 
        ? totalRevenue / completedPayments.length 
        : 0
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

module.exports = router;
