const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/database');

const router = express.Router();

// Initialize MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { 
    timeout: 5000,
    idempotencyKey: 'abc' 
  }
});

const preference = new Preference(client);
const payment = new Payment(client);

// Create payment preference for MercadoPago
router.post('/create-preference', authenticateToken, async (req, res) => {
  try {
    const { cartItems, totalAmount, user } = req.body;
    const userId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Create order in database
    const orderNumber = `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        total_amount: totalAmount,
        currency: 'PEN', // Peruvian Sol
        payment_method: 'mercadopago',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: orderData.id,
      course_id: item.id,
      course_title: item.title,
      course_price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw itemsError;
    }

    // Create MercadoPago preference
    const items = cartItems.map(item => ({
      id: item.id,
      title: item.title,
      description: `Curso: ${item.title} - ${item.instructor_name}`,
      picture_url: item.thumbnail_url,
      category_id: 'education',
      quantity: 1,
      currency_id: 'PEN',
      unit_price: parseFloat(item.price)
    }));

    const preferenceData = {
      items: items,
      payer: {
        name: user.name || 'Estudiante',
        email: user.email,
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1
      },
      shipments: {
        mode: 'not_specified'
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payment/success?order=${orderData.id}`,
        failure: `${process.env.FRONTEND_URL}/payment/failure?order=${orderData.id}`,
        pending: `${process.env.FRONTEND_URL}/payment/pending?order=${orderData.id}`
      },
      auto_return: 'approved',
      external_reference: orderData.id,
      notification_url: `${process.env.BACKEND_URL}/api/payments/mercadopago/webhook`,
      statement_descriptor: 'PERI INSTITUTE',
      binary_mode: false
    };

    const result = await preference.create({ body: preferenceData });

    res.json({
      success: true,
      checkoutUrl: result.init_point,
      preferenceId: result.id,
      orderId: orderData.id
    });

  } catch (error) {
    console.error('MercadoPago preference creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment preference',
      error: error.message
    });
  }
});

// Webhook for MercadoPago notifications
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      
      // Get payment details from MercadoPago
      const paymentDetails = await payment.get({ id: paymentId });
      
      if (paymentDetails.status === 'approved') {
        const orderId = paymentDetails.external_reference;
        
        // Update order status
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'completed',
            external_payment_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (!error) {
          // Get order details to create enrollments
          const { data: orderData } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                course_id
              )
            `)
            .eq('id', orderId)
            .single();

          if (orderData) {
            // Create enrollments for all courses
            const enrollments = orderData.order_items.map(item => ({
              user_id: orderData.user_id,
              course_id: item.course_id,
              enrolled_at: new Date().toISOString()
            }));

            await supabase
              .from('enrollments')
              .insert(enrollments);

            // Clear user's cart
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', orderData.user_id);
          }
        }
      } else if (paymentDetails.status === 'rejected') {
        const orderId = paymentDetails.external_reference;
        
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            external_payment_id: paymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('MercadoPago webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Get payment status
router.get('/payment-status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const { data: orderData, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !orderData) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order: orderData
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting payment status',
      error: error.message
    });
  }
});

module.exports = router;
