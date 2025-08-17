const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/database');

const router = express.Router();

// PayPal environment setup
function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  return process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

function client() {
  return new paypal.core.PayPalHttpClient(environment());
}

// Create PayPal order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { cartItems, totalAmount } = req.body;
    const userId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Create order in database
    const orderNumber = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        total_amount: totalAmount,
        currency: 'USD',
        payment_method: 'paypal',
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

    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment/success?order=${orderData.id}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?order=${orderData.id}`,
        brand_name: 'Peri Institute',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      },
      purchase_units: [
        {
          reference_id: orderData.id,
          description: `Peri Institute - ${cartItems.length} curso(s)`,
          amount: {
            currency_code: 'USD',
            value: totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: totalAmount.toFixed(2)
              }
            }
          },
          items: cartItems.map(item => ({
            name: item.title,
            description: `Curso por ${item.instructor_name}`,
            unit_amount: {
              currency_code: 'USD',
              value: item.price.toFixed(2)
            },
            quantity: '1',
            category: 'DIGITAL_GOODS'
          }))
        }
      ]
    });

    const order = await client().execute(request);

    res.json({
      success: true,
      orderId: order.result.id,
      dbOrderId: orderData.id
    });

  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating PayPal order',
      error: error.message
    });
  }
});

// Capture PayPal payment
router.post('/capture', authenticateToken, async (req, res) => {
  try {
    const { orderID, cartItems, totalAmount } = req.body;
    const userId = req.user.id;

    // Capture the payment
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await client().execute(request);
    
    if (capture.result.status === 'COMPLETED') {
      // Find the order by PayPal order ID
      const { data: orderData, error: findError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            course_id
          )
        `)
        .eq('user_id', userId)
        .eq('payment_method', 'paypal')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !orderData) {
        throw new Error('Order not found');
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          external_payment_id: orderID,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderData.id);

      if (updateError) {
        throw updateError;
      }

      // Create enrollments for all courses
      const enrollments = orderData.order_items.map(item => ({
        user_id: userId,
        course_id: item.course_id,
        enrolled_at: new Date().toISOString()
      }));

      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert(enrollments);

      if (enrollError) {
        console.error('Error creating enrollments:', enrollError);
      }

      // Clear user's cart
      const { error: cartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (cartError) {
        console.error('Error clearing cart:', cartError);
      }

      res.json({
        success: true,
        message: 'Payment captured successfully',
        orderId: orderData.id,
        paypalOrderId: orderID
      });

    } else {
      throw new Error('Payment not completed');
    }

  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(500).json({
      success: false,
      message: 'Error capturing PayPal payment',
      error: error.message
    });
  }
});

// Webhook for PayPal notifications
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // PayPal webhook verification should be implemented here
    // For now, we'll just acknowledge the webhook
    console.log('PayPal webhook received:', req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

module.exports = router;
