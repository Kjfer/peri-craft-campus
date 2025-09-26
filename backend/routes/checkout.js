const express = require('express');
const { supabaseAdmin } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { exchangeRateService } = require('../services/exchangeRateService');

const router = express.Router();

// @desc    Iniciar checkout - crear orden pendiente
// @route   POST /api/checkout/start
// @access  Private
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart_items, payment_method } = req.body;

    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El carrito está vacío'
      });
    }

    // Validar que el usuario puede comprar todos los cursos
    for (const item of cart_items) {
      // Verificar si ya está inscrito
      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', item.course_id)
        .single();

      if (enrollment) {
        return res.status(400).json({
          success: false,
          error: `Ya estás inscrito en el curso: ${item.course?.title || item.course_id}`
        });
      }

      // Verificar si ya tiene una orden pendiente
      const { data: pendingOrder } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_items!inner(course_id)
        `)
        .eq('user_id', userId)
        .eq('payment_status', 'pending')
        .eq('order_items.course_id', item.course_id);

      if (pendingOrder && pendingOrder.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Ya tienes una orden pendiente para el curso: ${item.course?.title || item.course_id}`
        });
      }
    }

    // Calcular total
    const total_amount = cart_items.reduce((sum, item) => sum + (item.course?.price || 0), 0);

    // Determinar moneda basada en el método de pago y país del usuario
    let currency = 'USD';
    
    if (payment_method === 'yape' || payment_method === 'plin') {
      // Verificar que el usuario es de Perú (aceptar 'Peru' y 'Perú', case-insensitive)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('country')
        .eq('user_id', userId)
        .single();

      const countryRaw = (profile && profile.country) ? profile.country.toString() : '';
      const country = countryRaw.trim().toLowerCase();

      if (!profile || (country !== 'peru' && country !== 'perú')) {
        return res.status(400).json({
          success: false,
          error: 'Yape y Plin solo están disponibles para usuarios de Perú'
        });
      }
      
      currency = 'PEN';
    }

    // Crear la orden - convertir precios usando tasa real si es necesario
    let finalTotalAmount = total_amount;
    if (currency === 'PEN') {
      try {
        finalTotalAmount = await exchangeRateService.convertUSDToPEN(total_amount);
        console.log(`💱 Checkout: Converted $${total_amount} USD to S/${finalTotalAmount} PEN`);
      } catch (error) {
        console.warn('⚠️ Exchange rate service failed in checkout, using fallback');
        finalTotalAmount = total_amount * 3.50; // Fallback actualizado
      }
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: finalTotalAmount,
        currency,
        payment_method,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(500).json({
        success: false,
        error: 'Error al crear la orden'
      });
    }

    // Crear los order_items - convertir precios individualmente si es necesario
    let orderItems;
    if (currency === 'PEN') {
      orderItems = await Promise.all(cart_items.map(async (item) => {
        let itemPrice = item.course?.price || 0;
        
        try {
          itemPrice = await exchangeRateService.convertUSDToPEN(itemPrice);
        } catch (error) {
          console.warn('⚠️ Failed to convert item price in checkout, using fallback');
          itemPrice = (item.course?.price || 0) * 3.50;
        }
        
        return {
          order_id: order.id,
          course_id: item.course_id,
          price: itemPrice
        };
      }));
    } else {
      orderItems = cart_items.map(item => ({
        order_id: order.id,
        course_id: item.course_id,
        price: item.course?.price || 0
      }));
    }

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Eliminar la orden si falla la creación de items
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return res.status(500).json({
        success: false,
        error: 'Error al crear los elementos de la orden'
      });
    }

    // Crear registro inicial en payments
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: payment_method,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    }

    // Actualizar orden con payment_id
    if (payment) {
      await supabaseAdmin
        .from('orders')
        .update({ payment_id: payment.id })
        .eq('id', order.id);
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        currency: order.currency,
        payment_method: order.payment_method,
        payment_status: order.payment_status
      },
      payment_id: payment?.id,
      next_step: getNextStepForPaymentMethod(payment_method)
    });

  } catch (error) {
    console.error('Error in checkout start:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// @desc    Confirmar pago con transaction_id (para Yape/Plin)
// @route   POST /api/checkout/confirm-payment
// @access  Private
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id, transaction_id, payment_method } = req.body;

    if (!order_id || !transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'ID de orden y ID de transacción son requeridos'
      });
    }

    // Verificar que la orden pertenece al usuario
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          course_id,
          price,
          courses (
            id,
            title
          )
        )
      `)
      .eq('id', order_id)
      .eq('user_id', userId)
      .eq('payment_status', 'pending')
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada o ya procesada'
      });
    }

    // Verificar que el método de pago sea Yape o Plin
    if (payment_method !== 'yape' && payment_method !== 'plin') {
      return res.status(400).json({
        success: false,
        error: 'Este endpoint es solo para pagos con Yape o Plin'
      });
    }

    // Actualizar el payment con transaction_id y marcar como paid
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        transaction_id,
        payment_status: 'completed'
      })
      .eq('id', order.payment_id);

    if (paymentUpdateError) {
      console.error('Error updating payment:', paymentUpdateError);
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar el pago'
      });
    }

    // Actualizar la orden
    const { error: orderUpdateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid'
      })
      .eq('id', order_id);

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar la orden'
      });
    }

    // Crear inscripciones para todos los cursos
    const enrollments = order.order_items.map(item => ({
      user_id: userId,
      course_id: item.course_id,
      enrolled_at: new Date().toISOString()
    }));

    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert(enrollments);

    if (enrollmentError) {
      console.error('Error creating enrollments:', enrollmentError);
      // Note: El pago ya se procesó, pero falló la inscripción
      // En un sistema real, esto requeriría manejo manual
    }

    res.json({
      success: true,
      message: 'Pago confirmado exitosamente',
      order: {
        id: order.id,
        order_number: order.order_number,
        payment_status: 'paid'
      },
      enrolled_courses: order.order_items.map(item => ({
        course_id: item.course_id,
        course_title: item.courses?.title
      }))
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// @desc    Obtener órdenes del usuario
// @route   GET /api/checkout/orders
// @access  Private
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          course_id,
          price,
          courses (
            id,
            title,
            thumbnail_url,
            instructor_name
          )
        ),
        payments (
          id,
          payment_status,
          transaction_id,
          created_at as payment_created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('payment_status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener las órdenes'
      });
    }

    res.json({
      success: true,
      orders: orders || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in orders endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// @desc    Obtener detalles de una orden específica
// @route   GET /api/checkout/orders/:id
// @access  Private
router.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          course_id,
          price,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            instructor_name,
            level,
            duration_hours
          )
        ),
        payments (
          id,
          payment_status,
          transaction_id,
          created_at as payment_created_at
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({
        success: false,
        error: 'Orden no encontrada'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Helper function
function getNextStepForPaymentMethod(paymentMethod) {
  switch (paymentMethod) {
    case 'yape':
    case 'plin':
      return 'manual_confirmation';
    case 'google_pay':
      return 'google_pay_redirect';
    case 'paypal':
      return 'paypal_redirect';
    case 'card':
      return 'card_form';
    default:
      return 'unknown';
  }
}

module.exports = router;
