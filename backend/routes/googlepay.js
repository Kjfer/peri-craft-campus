const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/database');

const router = express.Router();

// Process Google Pay payment
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { paymentData, cartItems, totalAmount } = req.body;
    const userId = req.user.id;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Create order in database
    const orderNumber = `GP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_number: orderNumber,
        total_amount: totalAmount,
        currency: 'USD',
        payment_method: 'googlepay',
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

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      payment_method_data: {
        type: 'card',
        card: {
          token: paymentData.paymentMethodData.tokenizationData.token
        }
      },
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment/success?order=${orderData.id}`,
      metadata: {
        orderId: orderData.id,
        userId: userId,
        orderNumber: orderNumber
      },
      description: `Peri Institute - ${cartItems.length} curso(s)`
    });

    if (paymentIntent.status === 'succeeded') {
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          external_payment_id: paymentIntent.id,
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
        message: 'Payment processed successfully',
        orderId: orderData.id,
        paymentIntentId: paymentIntent.id
      });

    } else if (paymentIntent.status === 'requires_action') {
      res.json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret
      });
    } else {
      throw new Error('Payment failed');
    }

  } catch (error) {
    console.error('Google Pay processing error:', error);
    
    // Update order status to failed if it was created
    if (req.body.orderId) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', req.body.orderId);
    }

    res.status(500).json({
      success: false,
      message: 'Error processing Google Pay payment',
      error: error.message
    });
  }
});

// Webhook for Stripe notifications
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('PaymentIntent was successful!', paymentIntent.id);
        
        // Update order status if not already updated
        if (paymentIntent.metadata.orderId) {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('payment_status')
            .eq('id', paymentIntent.metadata.orderId)
            .single();

          if (existingOrder && existingOrder.payment_status !== 'completed') {
            await supabase
              .from('orders')
              .update({
                payment_status: 'completed',
                external_payment_id: paymentIntent.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', paymentIntent.metadata.orderId);

            // Process enrollments and cart clearing
            const { data: orderData } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  course_id
                )
              `)
              .eq('id', paymentIntent.metadata.orderId)
              .single();

            if (orderData) {
              const enrollments = orderData.order_items.map(item => ({
                user_id: orderData.user_id,
                course_id: item.course_id,
                enrolled_at: new Date().toISOString()
              }));

              await supabase.from('enrollments').insert(enrollments);
              await supabase.from('cart_items').delete().eq('user_id', orderData.user_id);
            }
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('PaymentIntent failed!', failedPayment.id);
        
        if (failedPayment.metadata.orderId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              external_payment_id: failedPayment.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', failedPayment.metadata.orderId);
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

module.exports = router;
