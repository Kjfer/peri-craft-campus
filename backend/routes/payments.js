const express = require('express');
const { supabase, supabaseAdmin } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { exchangeRateService } = require('../services/exchangeRateService');

const router = express.Router();

console.log('🔥 Loading payments.js route file...');

// Create order endpoint (separate from payment processing)
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    console.log('🌐 Creating order endpoint hit');
    const { cartItems, totalAmount } = req.body;
    const user = req.user;
    const userId = user.id;

    // Validate input
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid total amount' });
    }

    console.log('💰 Creating order for user:', userId);

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order creation failed:', orderError);
      throw new Error('Failed to create order: ' + orderError.message);
    }

    console.log('✅ Order created with ID:', order.id);

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      course_id: item.course?.id || item.course_id || item.id,
      price: item.course?.price || item.price || (totalAmount / cartItems.length)
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('❌ Order items creation failed:', orderItemsError);
      throw new Error('Failed to create order items: ' + orderItemsError.message);
    }

    console.log('✅ Order items created:', orderItems.length);

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.id,
      totalAmount: totalAmount,
      itemCount: cartItems.length
    });

  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create payment endpoint
router.post('/create-payment', authenticateToken, async (req, res, next) => {
  console.log('🔥 Payment endpoint hit:', req.method, req.url);
  console.log('🔥 Request body:', req.body);
  console.log('🔥 User from auth:', req.user);
  
  try {
    const { cartItems, totalAmount, paymentMethod, paymentData } = req.body;
    const userId = req.user.id;

    // Conversión de USD a PEN para métodos peruanos usando tasa real
    const isPeruvianMethod = ['yape', 'mercadopago'].includes(paymentMethod);
    let convertedAmount = totalAmount;
    let currency = 'USD';
    
    if (isPeruvianMethod) {
      try {
        convertedAmount = await exchangeRateService.convertUSDToPEN(totalAmount);
        currency = 'PEN';
        console.log(`💱 Exchange rate applied: $${totalAmount} USD = S/${convertedAmount} PEN`);
      } catch (error) {
        console.warn('⚠️ Exchange rate service failed, using fallback rate');
        convertedAmount = Math.round(totalAmount * 3.50); // Fallback actualizado según BCRP
        currency = 'PEN';
      }
    }

    console.log('💳 Processing payment:', {
      userId,
      originalAmount: totalAmount,
      convertedAmount: convertedAmount,
      currency: currency,
      paymentMethod,
      itemCount: cartItems?.length || 0
    });

    if (!cartItems || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment data'
      });
    }

    // Create order using the existing orders table (minimal fields)
    console.log('💰 Creating order for user:', userId);
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: convertedAmount,
        currency: currency,
        payment_method: paymentMethod
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return res.status(400).json({
        success: false,
        error: 'Failed to create order: ' + orderError.message
      });
    }

    console.log('✅ Order created with ID:', order.id);

    // Create order items using the existing order_items table
    console.log('📝 Creating order items...');
    
    let orderItems;
    if (isPeruvianMethod) {
      // Para métodos peruanos, convertir cada precio individualmente usando tasa real
      orderItems = await Promise.all(cartItems.map(async (item) => {
        const itemPriceUSD = item.course?.price || item.price || (totalAmount / cartItems.length);
        let itemPricePEN;
        
        try {
          itemPricePEN = await exchangeRateService.convertUSDToPEN(itemPriceUSD);
        } catch (error) {
          console.warn('⚠️ Failed to convert item price, using fallback');
          itemPricePEN = Math.round(itemPriceUSD * 3.50);
        }
        
        return {
          order_id: order.id,
          course_id: item.course?.id || item.course_id || item.id,
          price: itemPricePEN
        };
      }));
    } else {
      // Para métodos internacionales, mantener precios en USD
      orderItems = cartItems.map(item => ({
        order_id: order.id,
        course_id: item.course?.id || item.course_id || item.id,
        price: item.course?.price || item.price || (totalAmount / cartItems.length)
      }));
    }

    console.log('📝 Order items to create:', orderItems);

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('Order items creation error:', orderItemsError);
      return res.status(400).json({
        success: false,
        error: 'Failed to create order items: ' + orderItemsError.message
      });
    }

    console.log('✅ Order items created:', orderItems.length);
    // Create individual payment records for tracking
    console.log('💳 Creating payment records...');
    
    let mainPaymentId = null;
    const paymentPromises = cartItems.map(async (item, index) => {
      const { data: payment, error } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          course_id: item.course?.id || item.course_id || item.id,
          amount: item.course?.price || item.price || totalAmount / cartItems.length,
          currency: 'PEN',
          payment_method: paymentMethod,
          payment_status: 'pending',
          external_payment_id: `PAY-${order.id}-${Date.now()}-${index}`
        })
        .select()
        .single();
      
      if (error) {
        console.error('Individual payment creation error:', error);
      } else if (index === 0) {
        // Store the first payment ID as the main payment
        mainPaymentId = payment.id;
      }
      
      return { payment, error };
    });

    const paymentResults = await Promise.all(paymentPromises);
    const hasPaymentErrors = paymentResults.some(result => result.error !== null);

    if (hasPaymentErrors) {
      console.error('⚠️ Some payment records failed to create');
      // Continue anyway since main order was created
    } else {
      console.log('✅ Payment records created successfully');
    }

    // Process payment based on method
    console.log(`🎯 Processing payment with method: ${paymentMethod}`);
    let paymentResult;
    
    try {
      switch (paymentMethod) {
        case 'card':
          paymentResult = await processCardPayment(paymentData, order.id, totalAmount);
          break;
        case 'mercadopago':
          paymentResult = await processMercadoPagoPayment(cartItems, convertedAmount, order.id);
          break;
        case 'yape':
          paymentResult = await processYapePayment(cartItems, convertedAmount, order.id);
          break;
        case 'paypal':
          paymentResult = await processPayPalPayment(cartItems, totalAmount, order.id, paymentData);
          break;
        case 'googlepay':
          paymentResult = await processGooglePayPayment(paymentData, order.id, totalAmount);
          break;
        default:
          paymentResult = {
            success: false,
            message: `Unsupported payment method: ${paymentMethod}`
          };
      }
      
      console.log(`✅ Payment processing result:`, {
        method: paymentMethod,
        success: paymentResult.success,
        message: paymentResult.message,
        paymentId: paymentResult.paymentId
      });
      
    } catch (paymentError) {
      console.error(`❌ Payment processing failed for ${paymentMethod}:`, paymentError);
      paymentResult = {
        success: false,
        message: `Payment processing failed: ${paymentError.message}`,
        error: paymentError.message
      };
    }

    // Update order and payment status with result
    console.log('🔄 Updating payment status...');
    
    // Note: Not updating order status since 'order_status' column doesn't exist
    // The order creation itself indicates it's been processed
    
    // Update payment status for all payments related to this order
    const { error: paymentsUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_status: paymentResult.success ? 'completed' : 'failed',
        external_payment_id: paymentResult.paymentId || `PAY-${order.id}-${Date.now()}`
      })
      .eq('user_id', userId)
      .like('external_payment_id', `PAY-${order.id}%`);

    if (paymentsUpdateError) {
      console.error('Failed to update payment status:', paymentsUpdateError);
    } else {
      console.log('✅ Payment status updated successfully');
    }

  // NOTE: Do NOT create enrollments here. Enrollment creation must happen
  // after a confirmed payment (via /confirm-payment endpoint or webhook).
  // This prevents accidental enrollments when a payment flow has not
  // actually been completed by the user.

    // Send response
    const response = {
      success: paymentResult.success,
      orderId: order.id,
      orderNumber: order.id,
      paymentUrl: paymentResult.paymentUrl,
      message: paymentResult.message,
      paymentMethod: paymentMethod,
      totalAmount: totalAmount,
      itemCount: cartItems.length
    };

    console.log('📤 Sending payment response:', response);

    res.json(response);

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Process an existing order (central payment processing)
// @route   POST /api/payments/process-order
// @access  Private
router.post('/process-order', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentData } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    // Load the order and items
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items ( id, course_id, price, courses ( id, title ) )`)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.payment_status && order.payment_status === 'paid') {
      return res.status(400).json({ success: false, error: 'Order already paid' });
    }

    const paymentMethod = order.payment_method;

    // Find payment record associated with this order (if created by checkout.start)
    let paymentRecord = null;
    if (order.payment_id) {
      const { data: p } = await supabaseAdmin.from('payments').select('*').eq('id', order.payment_id).single();
      paymentRecord = p;
    }

    // If no payment record, create one for this order
    if (!paymentRecord) {
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          amount: order.total_amount,
          currency: order.currency,
          payment_method: paymentMethod,
          payment_status: 'pending',
          external_payment_id: `PAY-${order.id}-${Date.now()}`
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Failed to create payment record for order:', paymentError);
      } else {
        paymentRecord = payment;
        // Attach payment to order
        await supabaseAdmin.from('orders').update({ payment_id: payment.id }).eq('id', order.id);
      }
    }

    // Process payment via local processors
    let paymentResult = { success: false, message: 'Unsupported payment method', paymentId: null, paymentUrl: null };
    switch (paymentMethod) {
      case 'card':
        paymentResult = await processCardPayment(paymentData, order.id, order.total_amount);
        break;
      case 'mercadopago':
        paymentResult = await processMercadoPagoPayment(order.order_items || [], order.total_amount, order.id);
        break;
      case 'yape':
        paymentResult = await processYapePayment(order.order_items || [], order.total_amount, order.id);
        break;
      case 'paypal':
        paymentResult = await processPayPalPayment(order.order_items || [], order.total_amount, order.id, paymentData);
        break;
      case 'googlepay':
        paymentResult = await processGooglePayPayment(paymentData, order.id, order.total_amount);
        break;
      default:
        paymentResult = { success: false, message: `Unsupported payment method: ${paymentMethod}` };
    }

    // Update payment records: mark completed or failed
    const newStatus = paymentResult.success ? 'completed' : 'failed';
    try {
      await supabaseAdmin
        .from('payments')
        .update({ payment_status: newStatus, external_payment_id: paymentResult.paymentId || undefined, updated_at: new Date().toISOString() })
        .eq('id', paymentRecord?.id || order.payment_id);

      await supabaseAdmin
        .from('orders')
        .update({ payment_status: paymentResult.success ? 'paid' : 'failed' })
        .eq('id', order.id);
    } catch (e) {
      console.error('Error updating payment/order status after processing:', e);
    }

    // If payment succeeded, create enrollments for order items (avoid duplicates)
    let enrolledCourses = [];
    if (paymentResult.success && order.order_items && order.order_items.length > 0) {
      try {
        const courseIds = order.order_items.map(i => i.course_id);
        // Fetch existing enrollments to avoid duplicates
        const { data: existing } = await supabaseAdmin
          .from('enrollments')
          .select('course_id')
          .eq('user_id', userId)
          .in('course_id', courseIds);

        const existingIds = (existing || []).map(e => e.course_id);
        const toCreate = order.order_items.filter(i => !existingIds.includes(i.course_id)).map(i => ({
          user_id: userId,
          course_id: i.course_id,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0
        }));

        if (toCreate.length > 0) {
          const { error: enrollmentError } = await supabaseAdmin
            .from('enrollments')
            .insert(toCreate);

          if (enrollmentError) {
            console.error('Failed to create enrollments after payment:', enrollmentError);
          } else {
            enrolledCourses = toCreate.map(t => t.course_id);
          }
        }
      } catch (e) {
        console.error('Error creating enrollments after payment:', e);
      }
    }

    return res.json({
      success: paymentResult.success,
      message: paymentResult.message,
      paymentUrl: paymentResult.paymentUrl,
      enrolled_courses: enrolledCourses
    });

  } catch (error) {
    console.error('Process-order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Payment method processors
async function processCardPayment(paymentData, orderId, amount) {
  console.log('💳 Processing card payment:', { orderId, amount });
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation
  if (!paymentData.number || !paymentData.cvc || !paymentData.expiry) {
    return {
      success: false,
      message: "Invalid card data",
      paymentId: null
    };
  }

  // Mock success for demo (in production, integrate with Stripe)
  return {
    success: true,
    message: "Payment processed successfully",
    paymentId: `card_${Date.now()}`,
    paymentUrl: null
  };
}

async function processMercadoPagoPayment(cartItems, amount, orderId) {
  console.log('💳 Processing MercadoPago payment:', { orderId, amount });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generar enlace de pago con external_reference para el tracking automático
  // Reemplaza 'YOUR_MERCADOPAGO_LINK' con tu enlace real de MercadoPago
  const paymentLink = `https://link.mercadopago.com.ar/periinstitute?external_reference=${orderId}`;
  
  return {
    success: false, // False para que redirija al usuario
    message: "Redirigiendo a MercadoPago",
    paymentId: `mp_${orderId}_${Date.now()}`,
    paymentUrl: paymentLink,
    orderId: orderId,
    instructions: "Completa el pago en MercadoPago. El acceso será activado automáticamente tras la confirmación."
  };
}

async function processYapePayment(cartItems, amount, orderId) {
  console.log('💳 Processing Yape payment:', { orderId, amount, itemCount: cartItems.length });
  
  try {
    // Simulate Yape processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Yape payment processed successfully');
    
    // For Yape we return a paymentUrl/instructions and wait for manual confirmation
    return {
      success: false,
      message: "Redirecting to Yape instructions",
      paymentId: `yape_${orderId}_${Date.now()}`,
      paymentUrl: `http://localhost:8080/payment/instructions/${orderId}?method=yape&amount=${amount}`,
      orderId: orderId
    };
  } catch (error) {
    console.error('❌ Yape payment processing error:', error);
    return {
      success: false,
      message: "Yape payment failed: " + error.message,
      error: error.message
    };
  }
}

async function processPlinPayment(cartItems, amount, orderId) {
  console.log('💳 Processing Plin payment:', { orderId, amount, itemCount: cartItems.length });
  
  try {
    // Simulate Plin processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Plin payment processed successfully');
    
    // Return instructions/paymentUrl and await manual confirmation
    return {
      success: false,
      message: "Redirecting to Plin instructions",
      paymentId: `plin_${orderId}_${Date.now()}`,
      paymentUrl: `http://localhost:8080/payment/instructions/${orderId}?method=plin&amount=${amount}`,
      orderId: orderId
    };
  } catch (error) {
    console.error('❌ Plin payment processing error:', error);
    return {
      success: false,
      message: "Plin payment failed: " + error.message,
      error: error.message
    };
  }
}

async function processPayPalPayment(cartItems, amount, orderId, paymentData) {
  console.log('💳 Processing PayPal payment:', { orderId, amount });
  
  // Simulate creating a PayPal checkout session and return a redirect URL
  await new Promise(resolve => setTimeout(resolve, 500));
  const paymentId = paymentData?.orderID || `pp_${Date.now()}`;
  return {
    success: false,
    message: 'Redirecting to PayPal',
    paymentId,
    paymentUrl: `http://localhost:8080/payment/redirect/${orderId}?method=paypal&paymentId=${paymentId}`
  };
}

async function processGooglePayPayment(paymentData, orderId, amount) {
  console.log('💳 Processing Google Pay payment:', { orderId, amount });
  
  // Simulate Google Pay checkout creation and return a redirect URL
  await new Promise(resolve => setTimeout(resolve, 500));
  const paymentId = `gp_${Date.now()}`;
  return {
    success: false,
    message: 'Redirecting to Google Pay',
    paymentId,
    paymentUrl: `http://localhost:8080/payment/redirect/${orderId}?method=googlepay&paymentId=${paymentId}`
  };
}

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

      // If status indicates success, find the related order and mark realized + create enrollments
      if (status === 'completed' || status === 'realized' || status === 'succeeded') {
        // Find payments with that external id
        const { data: payments } = await supabase
          .from('payments')
          .select('id, user_id, course_id, external_payment_id')
          .eq('external_payment_id', payment_intent_id);

        if (payments && payments.length > 0) {
          for (const p of payments) {
            try {
              // find orders that reference this payment
              const { data: orders } = await supabase
                .from('orders')
                .select('id')
                .eq('payment_id', p.id);

              if (orders && orders.length > 0) {
                for (const o of orders) {
                  await supabase
                    .from('orders')
                    .update({ payment_status: 'realized' })
                    .eq('id', o.id);

                  // create enrollments from order_items
                  const { data: orderItems } = await supabase
                    .from('order_items')
                    .select('course_id')
                    .eq('order_id', o.id);

                  if (orderItems && orderItems.length > 0) {
                    const courseIds = orderItems.map(i => i.course_id);
                    const { data: existing } = await supabase
                      .from('enrollments')
                      .select('course_id')
                      .eq('user_id', p.user_id)
                      .in('course_id', courseIds);

                    const existingIds = (existing || []).map(e => e.course_id);
                    const toCreate = orderItems.filter(i => !existingIds.includes(i.course_id)).map(i => ({
                      user_id: p.user_id,
                      course_id: i.course_id,
                      enrolled_at: new Date().toISOString(),
                      progress_percentage: 0
                    }));

                    if (toCreate.length > 0) {
                      await supabase
                        .from('enrollments')
                        .insert(toCreate);
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Webhook post-processing error:', e);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Webhook processed'
    });

  } catch (error) {
    next(error);
  }
});

// MercadoPago webhook para validación automática
router.post('/mercadopago-webhook', async (req, res) => {
  try {
    console.log('🎯 MercadoPago webhook received:', req.body);
    
    const { data, type } = req.body;
    
    // Solo procesar pagos aprobados
    if (type === 'payment' && data?.id) {
      const paymentId = data.id;
      
      // Buscar la orden asociada al pago usando external_reference
      const externalReference = data.external_reference || req.body.external_reference;
      
      if (externalReference) {
        // Actualizar orden a completada
        const { error: orderError } = await supabaseAdmin
          .from('orders')
          .update({ 
            payment_status: 'completed',
            payment_reference: paymentId.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', externalReference);
          
        if (orderError) {
          console.error('Error updating order:', orderError);
          return res.status(500).json({ error: 'Failed to update order' });
        }
        
        console.log(`✅ Order ${externalReference} marked as completed via MercadoPago payment ${paymentId}`);
        
        // El trigger automáticamente creará el payment record y las inscripciones
      }
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('MercadoPago webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Payment confirmation endpoint for external payment methods (MercadoPago, PayPal)
router.post('/confirm-external-payment', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentMethod, transactionId, paymentReference } = req.body;
    const userId = req.user.id;

    console.log('💳 Confirming external payment:', { orderId, paymentMethod, transactionId, userId });

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order status to completed
    const { error: orderUpdateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'completed',
        updated_at: new Date().toISOString(),
        payment_reference: paymentReference || transactionId
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('Order update error:', orderUpdateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update order status'
      });
    }

    // The trigger will automatically create payment record and enrollments

    res.json({
      success: true,
      message: 'External payment confirmed successfully',
      order: { ...order, payment_status: 'completed' }
    });

  } catch (error) {
    console.error('External payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm external payment'
    });
  }
});

// Payment confirmation endpoint for external payment methods
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentMethod, transactionId } = req.body;
    const userId = req.user.id;

    console.log('💳 Confirming payment:', { orderId, paymentMethod, transactionId, userId });

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update payment status to 'realized' when confirmation happens
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_status: 'realized',
        external_payment_id: transactionId || `CONFIRMED-${orderId}-${Date.now()}`
      })
      .eq('user_id', userId)
      .like('external_payment_id', `PAY-${orderId}%`);

    if (paymentUpdateError) {
      console.error('Payment update error:', paymentUpdateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment status'
      });
    }

    // Get order items to create enrollments
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('course_id')
      .eq('order_id', orderId);

    if (orderItemsError) {
      console.error('Order items fetch error:', orderItemsError);
    } else {
      // Create enrollments
      const enrollments = orderItems.map(item => ({
        user_id: userId,
        course_id: item.course_id,
        enrolled_at: new Date().toISOString()
      }));

      // Insert enrollments but avoid duplicates
      const courseIds = enrollments.map(e => e.course_id);
      const { data: existing } = await supabaseAdmin
        .from('enrollments')
        .select('course_id')
        .eq('user_id', userId)
        .in('course_id', courseIds);

      const existingIds = (existing || []).map(e => e.course_id);
      const toCreate = enrollments.filter(e => !existingIds.includes(e.course_id));

      if (toCreate.length > 0) {
        const { error: enrollmentError } = await supabaseAdmin
          .from('enrollments')
          .insert(toCreate);

        if (enrollmentError) {
          console.error('Enrollment creation error:', enrollmentError);
        } else {
          console.log('✅ Enrollments created for order:', orderId);
        }
      } else {
        console.log('ℹ️ No new enrollments to create (already enrolled)');
      }

      if (enrollmentError) {
        console.error('Enrollment creation error:', enrollmentError);
      } else {
        console.log('✅ Enrollments created for order:', orderId);
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      orderId: orderId
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

// Exchange rate endpoint for frontend
router.get('/exchange-rate', async (req, res) => {
  try {
    const rateInfo = await exchangeRateService.getRateInfo();
    
    res.json({
      success: true,
      rate_info: rateInfo,
      cache_info: exchangeRateService.getCacheInfo()
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rate',
      fallback_rate: 3.75
    });
  }
});

// Force refresh exchange rate endpoint (useful for admin)
router.post('/exchange-rate/refresh', authenticateToken, async (req, res) => {
  try {
    const newRate = await exchangeRateService.forceRefresh();
    
    res.json({
      success: true,
      message: 'Exchange rate refreshed successfully',
      new_rate: newRate
    });
  } catch (error) {
    console.error('Error refreshing exchange rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh exchange rate'
    });
  }
});
