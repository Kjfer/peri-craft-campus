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
  cartItems: {
    id: string;
    title: string;
    price: number;
    instructor_name: string;
    thumbnail_url?: string;
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
    const { cartItems = [], totalAmount, paymentMethod, paymentData } = body;

    console.log("Processing payment:", { 
      userId: user.id, 
      totalAmount, 
      paymentMethod, 
      itemCount: Array.isArray(cartItems) ? cartItems.length : 0 
    });

    // Use service role client for database operations
    const supabaseService = createClient(
      getEnv("SUPABASE_URL") ?? "",
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create order
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        currency: 'USD',
        payment_method: paymentMethod,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      course_id: item.id,
      price: item.price
    }));

    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // Process payment based on method
    let paymentResult;
    
    switch (paymentMethod) {
      case 'card':
        paymentResult = await processCardPayment(paymentData, order.id, totalAmount);
        break;
      case 'mercadopago':
      case 'mercadopago_card':
        paymentResult = await processMercadoPagoPayment(cartItems, totalAmount, order.id, paymentData);
        break;
      case 'yape':
        paymentResult = await processYapePayment(cartItems, totalAmount, order.id, paymentData);
        break;
      case 'plin':
        paymentResult = await processPlinPayment(cartItems, totalAmount, order.id, paymentData);
        break;
      case 'paypal':
        paymentResult = await processPayPalPayment(cartItems, totalAmount, order.id, paymentData);
        break;
      case 'googlepay':
        paymentResult = await processGooglePayPayment(paymentData, order.id, totalAmount);
        break;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    // Update order with payment result - keep as pending for external payment methods
    let finalStatus = 'pending';
    if (paymentMethod === 'paypal' || paymentMethod === 'googlepay') {
      // These are processed immediately
      finalStatus = paymentResult.success ? 'completed' : 'failed';
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

    // Create enrollments only for immediately processed payments
    if (finalStatus === 'completed') {
      const enrollments = cartItems.map(item => ({
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

  // NOTE: Do NOT create enrollments here. Enrollment creation must be
  // triggered only after external confirmation (webhook or explicit
  // confirmation endpoint). This avoids creating enrollments when the
  // payment provider flow hasn't been finalized.

    return new Response(
      JSON.stringify({
        success: paymentResult.success,
        orderId: order.id,
        orderNumber: order.order_number,
        paymentUrl: paymentResult.paymentUrl,
        message: paymentResult.message
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
async function processCardPayment(paymentData: any, orderId: string, amount: number) {
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

async function processMercadoPagoPayment(cartItems: any[], amount: number, orderId: string, paymentData?: any) {
  const accessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }

  // Create MercadoPago preference
  const preference = {
    items: cartItems.map(item => ({
      title: item.title,
      quantity: 1,
      unit_price: item.price,
      currency_id: 'USD'
    })),
    payer: {
      email: paymentData?.user?.email || 'test@test.com',
      name: paymentData?.user?.name || 'Test User'
    },
    external_reference: orderId,
    notification_url: `${getEnv('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
    back_urls: {
      success: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/success/${orderId}`,
      failure: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/failed`,
      pending: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/pending`
    },
    auto_return: 'approved'
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('MercadoPago API error:', errorData);
      throw new Error(`MercadoPago API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: "Redirecting to MercadoPago",
      paymentId: data.id,
      paymentUrl: data.init_point
    };
  } catch (error) {
    console.error('MercadoPago payment error:', error);
    return {
      success: false,
      message: error.message,
      paymentId: null,
      paymentUrl: null
    };
  }
}

async function processYapePayment(cartItems: any[], amount: number, orderId: string, paymentData?: any) {
  const accessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }

  // Create MercadoPago preference with Yape as preferred payment method
  const preference = {
    items: cartItems.map(item => ({
      title: item.title,
      quantity: 1,
      unit_price: Math.round(item.price * 3.75), // Convert to PEN
      currency_id: 'PEN'
    })),
    payer: {
      email: paymentData?.user?.email || 'test@test.com',
      name: paymentData?.user?.name || 'Test User'
    },
    payment_methods: {
      excluded_payment_types: [],
      excluded_payment_methods: []
    },
    external_reference: orderId,
    notification_url: `${getEnv('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
    back_urls: {
      success: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/success/${orderId}`,
      failure: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/failed`,
      pending: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/pending`
    },
    auto_return: 'approved'
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('MercadoPago Yape API error:', errorData);
      throw new Error(`MercadoPago Yape API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: "Redirecting to Yape via MercadoPago",
      paymentId: data.id,
      paymentUrl: data.init_point
    };
  } catch (error) {
    console.error('Yape payment error:', error);
    return {
      success: false,
      message: error.message,
      paymentId: null,
      paymentUrl: null
    };
  }
}

async function processPlinPayment(cartItems: any[], amount: number, orderId: string, paymentData?: any) {
  const accessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }

  // Create MercadoPago preference with Plin as preferred payment method
  const preference = {
    items: cartItems.map(item => ({
      title: item.title,
      quantity: 1,
      unit_price: Math.round(item.price * 3.75), // Convert to PEN
      currency_id: 'PEN'
    })),
    payer: {
      email: paymentData?.user?.email || 'test@test.com',
      name: paymentData?.user?.name || 'Test User'
    },
    payment_methods: {
      excluded_payment_types: [],
      excluded_payment_methods: []
    },
    external_reference: orderId,
    notification_url: `${getEnv('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,  
    back_urls: {
      success: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/success/${orderId}`,
      failure: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/failed`,
      pending: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/pending`
    },
    auto_return: 'approved'
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('MercadoPago Plin API error:', errorData);
      throw new Error(`MercadoPago Plin API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: "Redirecting to Plin via MercadoPago",
      paymentId: data.id,
      paymentUrl: data.init_point
    };
  } catch (error) {
    console.error('Plin payment error:', error);
    return {
      success: false,
      message: error.message,
      paymentId: null,
      paymentUrl: null
    };
  }
}

async function processPayPalPayment(cartItems: any[], amount: number, orderId: string, paymentData?: any) {
  // Mock PayPal integration
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: "PayPal payment processed",
    paymentId: paymentData?.orderID || `pp_${Date.now()}`,
    paymentUrl: null
  };
}

async function processGooglePayPayment(paymentData: any, orderId: string, amount: number) {
  // Mock Google Pay integration
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: "Google Pay payment processed",
    paymentId: `gp_${Date.now()}`,
    paymentUrl: null
  };
}