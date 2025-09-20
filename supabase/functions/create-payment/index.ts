import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Helper to read environment variables in Deno and Node (fallback)
function getEnv(key: string): string | undefined {
  try {
    // Deno
    // @ts-ignore
    if (typeof Deno !== 'undefined' && Deno?.env?.get) {
      // @ts-ignore
      return Deno.env.get(key);
    }
  } catch (e) {
    // ignore
  }

  try {
    // Node.js fallback when running locally for tests
    // @ts-ignore
    if (typeof process !== 'undefined' && process?.env) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // ignore
  }

  return undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  items: {
    id: string;
    type: 'course' | 'subscription';
    title: string;
    price: number;
    instructor_name?: string;
    thumbnail_url?: string;
    description?: string;
    duration_months?: number;
  }[];
  totalAmount: number;
  paymentMethod: string;
  paymentData?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log env visibility for debugging (safe - only keys)
    try {
      // @ts-ignore
      const envKeys = (typeof Deno !== 'undefined' && Deno?.env?.toObject) ? Object.keys(Deno.env.toObject()) : [];
      console.log("🔎 Env keys present:", envKeys.filter(k => k.includes('SUPABASE') || k.includes('MERCADOPAGO')));
    } catch (_e) { /* ignore */ }

    // Get user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      getEnv("SUPABASE_URL") ?? "",
      getEnv("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Invalid user token");
    }

    const user = userData.user;
    // Parse and validate request body
    const body = await req.json() as PaymentRequest;
    const { items = [], totalAmount, paymentMethod, paymentData } = body;

    console.log("Processing payment:", { 
      userId: user.id, 
      totalAmount, 
      paymentMethod, 
      itemCount: Array.isArray(items) ? items.length : 0,
      items: items.map(item => ({ id: item.id, type: item.type, title: item.title }))
    });

    // Use service role client for database operations
    const supabaseService = createClient(
      getEnv("SUPABASE_URL") ?? "",
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create order
    const currency = (paymentMethod === 'mercadopago' || paymentMethod === 'yape_qr') ? 'PEN' : 'USD';
    const finalAmount = (paymentMethod === 'mercadopago' || paymentMethod === 'yape_qr') ? totalAmount * 3.75 : totalAmount;

    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: finalAmount,
        currency: currency,
        payment_method: paymentMethod,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      course_id: item.type === 'course' ? item.id : null,
      subscription_id: item.type === 'subscription' ? item.id : null,
      price: (paymentMethod === 'mercadopago' || paymentMethod === 'yape_qr') ? item.price * 3.75 : item.price
    }));

    console.log("Creating order items:", orderItems);

    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // Create initial payment record
    const { data: payment, error: paymentError } = await supabaseService
      .from('payments')
      .insert({
        user_id: user.id,
        order_id: order.id,
        amount: finalAmount,
        currency: currency,
        payment_method: paymentMethod,
        payment_provider: paymentMethod === 'mercadopago' ? 'mercadopago' : paymentMethod === 'yape_qr' ? 'yape' : paymentMethod
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
    }

    // Process payment based on method
    let paymentResult;
    
    switch (paymentMethod) {
      case 'card':
        paymentResult = await processCardPayment(paymentData, order.id, totalAmount, payment?.id);
        break;
      case 'mercadopago':
        paymentResult = await processMercadoPagoPayment(items, totalAmount, order.id, paymentData, authHeader, payment?.id);
        break;
      case 'yape_qr':
        paymentResult = await processYapeQRPayment(order.id, totalAmount, payment?.id, items, user, paymentData?.receiptUrl, paymentData?.operationCode);
        break;
      case 'paypal':
        paymentResult = await processPayPalPayment(items, totalAmount, order.id, paymentData, payment?.id);
        break;
      case 'googlepay':
        paymentResult = await processGooglePayPayment(paymentData, order.id, totalAmount, payment?.id);
        break;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    // Update order with payment result - keep as pending for external payment methods
    let finalStatus = 'pending';
    if (paymentMethod === 'paypal' || paymentMethod === 'googlepay') {
      // These are processed immediately
      finalStatus = paymentResult.success ? 'completed' : 'failed';
    } else if (paymentMethod === 'yape_qr') {
      // Yape QR stays pending until manual confirmation
      finalStatus = 'pending';
    } else if (!paymentResult.success) {
      finalStatus = 'failed';
    }
    
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({
        payment_status: finalStatus,
        payment_id: paymentResult.paymentId
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
    }

    // Update payment record with provider payment ID if available
    if (payment && paymentResult.paymentId) {
      await supabaseService
        .from('payments')
        .update({
          payment_provider_id: paymentResult.paymentId
        })
        .eq('id', payment.id);
    }

    // Create enrollments only for immediately processed payments (only for courses)
    if (finalStatus === 'completed') {
      const courseItems = items.filter(item => item.type === 'course');
      if (courseItems.length > 0) {
        const enrollments = courseItems.map(item => ({
          user_id: user.id,
          course_id: item.id,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0
        }));

        const { error: enrollError } = await supabaseService
          .from('enrollments')
          .insert(enrollments);

        if (enrollError) {
          console.error('Failed to create enrollments:', enrollError);
        }
      }
      
      // Handle subscriptions (create user_subscriptions)
      const subscriptionItems = items.filter(item => item.type === 'subscription');
      if (subscriptionItems.length > 0) {
        const userSubscriptions = subscriptionItems.map(item => ({
          user_id: user.id,
          plan_id: item.id,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + (item.duration_months || 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        }));

        const { error: subError } = await supabaseService
          .from('user_subscriptions')
          .insert(userSubscriptions);

        if (subError) {
          console.error('Failed to create subscriptions:', subError);
        }
      }
    }

  // NOTE: Do NOT create enrollments here. Enrollment creation must be
  // triggered only after external confirmation (webhook or explicit
  // confirmation endpoint). This avoids creating enrollments when the
  // payment provider flow hasn't been finalized.

    return new Response(
      JSON.stringify({
        success: paymentResult.success,
        order: order,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentUrl: paymentResult.paymentUrl,
        message: paymentResult.message,
        redirectUrl: paymentResult.redirectUrl,
        items: items
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: paymentResult.success ? 200 : 400,
      }
    );

  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Mock payment processors - replace with real implementations
async function processCardPayment(paymentData: any, orderId: string, amount: number, paymentId?: string) {
  // Simulate card processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation
  if (!paymentData.number || !paymentData.cvc || !paymentData.expiry) {
    return {
      success: false,
      message: "Invalid card data",
      paymentId: null
    };
  }

  // Mock success for demo
  return {
    success: true,
    message: "Payment processed successfully",
    paymentId: `card_${Date.now()}`,
    paymentUrl: null
  };
}

async function processMercadoPagoPayment(
  items: any[],
  amount: number,
  orderId: string,
  paymentData?: any,
  authHeader?: string | null,
  paymentId?: string
) {
  try {
    const url = `${getEnv('SUPABASE_URL')}/functions/v1/mp-preference`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        items: items,
        totalAmount: amount,
        orderId,
        paymentData,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('mp-preference proxy error:', resp.status, text);
      return { success: false, message: 'Failed to create preference', paymentId: null, paymentUrl: null };
    }

    const data = await resp.json();
    return {
      success: !!data.success,
      message: data.message,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
    };
  } catch (error: any) {
    console.error('MercadoPago proxy error:', error);
    return { success: false, message: error?.message || 'Error', paymentId: null, paymentUrl: null };
  }
}

async function processPayPalPayment(items: any[], amount: number, orderId: string, paymentData?: any, paymentId?: string) {
  // Mock PayPal integration
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: "PayPal payment processed",
    paymentId: paymentData?.orderID || `pp_${Date.now()}`,
    paymentUrl: null
  };
}

async function processGooglePayPayment(paymentData: any, orderId: string, amount: number, paymentId?: string) {
  // Mock Google Pay integration
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: "Google Pay payment processed",
    paymentId: `gp_${Date.now()}`,
    paymentUrl: null
  };
}

async function processYapeQRPayment(orderId: string, amount: number, paymentId?: string, items?: any[], user?: any, receiptUrl?: string, operationCode?: string) {
  // For Yape QR, we just create the order and return success
  // Payment confirmation happens later through confirmManualPayment endpoint
  
  console.log('Processing Yape QR order creation for order ID:', orderId);
  
  return {
    success: true,
    message: "Order created successfully. Please complete payment and upload receipt.",
    paymentId: `yape_pending_${Date.now()}`,
    paymentUrl: null,
    redirectUrl: null,
    items: items?.map(item => ({
      id: item.id,
      type: item.type,
      name: item.title
    })) || []
  };
}