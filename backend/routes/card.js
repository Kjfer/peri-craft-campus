const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Process card payment
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { cardData, cartItems, totalAmount, user } = req.body;
    const userId = req.user.id;

    console.log('Processing card payment for user:', userId);

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: cardData.email,
      name: cardData.name,
    });

    // Create payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardData.number.replace(/\s/g, ''),
        exp_month: parseInt(cardData.expiry.split('/')[0]),
        exp_year: parseInt('20' + cardData.expiry.split('/')[1]),
        cvc: cardData.cvc,
      },
      billing_details: {
        name: cardData.name,
        email: cardData.email,
      },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      customer: customer.id,
      payment_method: paymentMethod.id,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment-result`,
      metadata: {
        user_id: userId,
        cart_items: JSON.stringify(cartItems.map(item => ({ 
          id: item.id, 
          title: item.title, 
          price: item.price 
        }))),
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'completed',
          payment_method: 'card',
          payment_intent_id: paymentIntent.id,
          customer_email: cardData.email,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error('Error creating order');
      }

      // Add order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        course_id: item.id,
        course_title: item.title,
        price: item.price,
        instructor_name: item.instructor_name,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw new Error('Error creating order items');
      }

      // Create enrollments
      const enrollments = cartItems.map(item => ({
        user_id: userId,
        course_id: item.id,
        enrolled_at: new Date().toISOString(),
        payment_status: 'paid',
        order_id: order.id,
      }));

      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert(enrollments);

      if (enrollError) {
        console.error('Error creating enrollments:', enrollError);
        throw new Error('Error creating enrollments');
      }

      // Clear cart
      const { error: cartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (cartError) {
        console.error('Error clearing cart:', cartError);
      }

      res.json({
        success: true,
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        message: 'Payment processed successfully',
      });

    } else if (paymentIntent.status === 'requires_action') {
      res.json({
        success: false,
        requires_action: true,
        payment_intent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
        },
      });
    } else {
      throw new Error('Payment failed');
    }

  } catch (error) {
    console.error('Card payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing card payment',
    });
  }
});

// Confirm payment after 3D Secure
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Payment was successful after 3D Secure
      res.json({
        success: true,
        paymentIntentId: paymentIntent.id,
      });
    } else {
      res.json({
        success: false,
        message: 'Payment not completed',
      });
    }

  } catch (error) {
    console.error('Card confirmation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error confirming payment',
    });
  }
});

module.exports = router;
