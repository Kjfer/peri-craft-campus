import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase URL and service role key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from the auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    const { cartItems, totalAmount, paymentData } = await req.json()

    console.log('Google Pay payment request:', { cartItems, totalAmount, paymentData, userId: user.id })

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        payment_method: 'googlepay',
        payment_status: 'pending',
        currency: 'USD'
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      throw new Error('Failed to create order')
    }

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      course_id: item.course_id || item.id || null,
      subscription_id: item.subscription_id || null,
      price: item.price || item.course?.price || 0,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      throw new Error('Failed to create order items')
    }

    // Process Google Pay payment
    // In a real implementation, you would:
    // 1. Validate the payment token with Google Pay API
    // 2. Process the payment through your payment processor
    // 3. Handle the payment response

    console.log('Processing Google Pay payment...', paymentData)

    // For demo purposes, we'll simulate a successful payment
    const paymentSuccessful = true

    if (paymentSuccessful) {
      // Update order status to completed
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'completed',
          payment_id: `googlepay_${Date.now()}`
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Error updating order status:', updateError)
        throw new Error('Failed to update order status')
      }

      // Create enrollments for each course
      const courseItems = cartItems.filter((item: any) => item.course_id || (item.id && !item.subscription_id));
      if (courseItems.length > 0) {
        const enrollments = courseItems.map((item: any) => ({
          user_id: user.id,
          course_id: item.course_id || item.id,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0
        }));

        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .upsert(enrollments, { onConflict: 'user_id,course_id' });

        if (enrollmentError) {
          console.error('Error creating enrollments:', enrollmentError);
        }
      }

      // Create subscriptions
      const subscriptionItems = cartItems.filter((item: any) => item.subscription_id);
      for (const item of subscriptionItems) {
        const { data: plan } = await supabase
          .from('plans')
          .select('duration_months')
          .eq('id', item.subscription_id)
          .single();

        if (plan) {
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + plan.duration_months);

          await supabase.from('user_subscriptions').insert({
            user_id: user.id,
            plan_id: item.subscription_id,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            payment_id: `googlepay_${Date.now()}`,
          });
        }
      }

      // Record payment
      await supabase.from('payments').insert({
        user_id: user.id,
        order_id: order.id,
        amount: totalAmount,
        currency: 'USD',
        payment_method: 'googlepay',
        payment_provider: 'google',
        payment_provider_id: `googlepay_${Date.now()}`,
      });

      console.log('✅ Pago de Google Pay procesado exitosamente');

      // Clear user's cart (assuming you have a cart table)
      const { error: cartError } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)

      if (cartError) {
        console.error('Error clearing cart:', cartError)
        // Continue even if cart clearing fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          orderId: order.id,
          message: 'Google Pay payment processed successfully'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      // Payment failed
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', order.id)

      throw new Error('Google Pay payment failed')
    }

  } catch (error: any) {
    console.error('Google Pay function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})