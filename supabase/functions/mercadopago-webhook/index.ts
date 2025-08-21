import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function getEnv(key: string): string | undefined {
  try {
    // @ts-ignore
    if (typeof Deno !== 'undefined' && Deno?.env?.get) {
      // @ts-ignore
      return Deno.env.get(key);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📦 MercadoPago webhook received");
    
    const body = await req.json();
    console.log("📦 Webhook payload:", JSON.stringify(body, null, 2));

    // MercadoPago webhook structure
    const { type, data } = body;
    
    if (type !== 'payment') {
      console.log("📦 Ignoring non-payment webhook");
      return new Response("OK", { status: 200 });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.log("📦 No payment ID in webhook");
      return new Response("No payment ID", { status: 400 });
    }

    // Get payment details from MercadoPago API
    const accessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    console.log("📦 Payment details:", JSON.stringify(payment, null, 2));

    // Use service role client for database operations
    const supabaseService = createClient(
      getEnv("SUPABASE_URL") ?? "",
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find order by payment ID or external reference
    const { data: orders, error: orderError } = await supabaseService
      .from('orders')
      .select('*')
      .or(`id.eq.${payment.external_reference},payment_id.eq.${paymentId}`)
      .limit(1);

    if (orderError) {
      console.error("📦 Error finding order:", orderError);
      throw new Error(`Failed to find order: ${orderError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log("📦 No order found for payment:", { paymentId, external_reference: payment.external_reference });
      return new Response("Order not found", { status: 404 });
    }

    const order = orders[0];
    console.log("📦 Found order:", order.id);

    // Update order status based on payment status
    let newStatus = 'pending';
    if (payment.status === 'approved') {
      newStatus = 'completed';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      newStatus = 'failed';
    }

    console.log("📦 Payment status detail:", payment.status, payment.status_detail);
    console.log("📦 Updating order status to:", newStatus);
    // Update order
    const { error: updateError } = await supabaseService
      .from('orders')
      .update({
        payment_status: newStatus,
        payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error("📦 Error updating order:", updateError);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // If payment is approved, create enrollments
    if (newStatus === 'completed') {
      console.log("📦 Payment approved, creating enrollments");

      // Get order items
      const { data: orderItems, error: itemsError } = await supabaseService
        .from('order_items')
        .select('course_id')
        .eq('order_id', order.id);

      if (itemsError) {
        console.error("📦 Error getting order items:", itemsError);
        throw new Error(`Failed to get order items: ${itemsError.message}`);
      }

      // Create enrollments for each course
      const enrollments = orderItems.map(item => ({
        user_id: order.user_id,
        course_id: item.course_id,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0
      }));

      const { error: enrollError } = await supabaseService
        .from('enrollments')
        .insert(enrollments);

      if (enrollError) {
        console.error("📦 Error creating enrollments:", enrollError);
        // Don't throw here, the payment was processed successfully
        console.log("📦 Payment processed but enrollment creation failed");
      } else {
        console.log("📦 Enrollments created successfully for", enrollments.length, "courses");
      }
    }

    console.log("📦 Webhook processed successfully");
    return new Response("OK", { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("📦 Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});