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

    // MercadoPago webhook structure - handle both "payment" and "merchant_order" topics
    const { type, data, action, topic, resource } = body as any;

    let eventKind: 'payment' | 'merchant_order' | 'unknown' = 'unknown';
    let paymentIdFromEvent: string | undefined;
    let merchantOrderId: string | undefined;

    if (type === 'payment' || topic === 'payment' || (action?.startsWith('payment') && data?.id)) {
      eventKind = 'payment';
      paymentIdFromEvent = data?.id;
    } else if (topic === 'merchant_order' || (typeof resource === 'string' && resource.includes('/merchant_orders/'))) {
      eventKind = 'merchant_order';
      merchantOrderId = data?.id || (typeof resource === 'string' ? resource.split('/').pop() : undefined);
    }

    if (eventKind === 'unknown') {
      console.log("📦 Ignoring unsupported webhook");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // If merchant_order, fetch details and update order accordingly, then return early
    if (eventKind === 'merchant_order') {
      try {
        const accessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
        if (!accessToken) {
          throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
        }
        if (!merchantOrderId) {
          console.log("📦 No merchant order ID");
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const moResp = await fetch(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!moResp.ok) {
          console.error("📦 Failed to fetch merchant order:", moResp.status);
          return new Response("OK", { status: 200, headers: corsHeaders });
        }
        const merchantOrder = await moResp.json();
        console.log("📦 Merchant order:", JSON.stringify(merchantOrder, null, 2));

        const externalRef = merchantOrder.external_reference as string | undefined;
        const payments = Array.isArray(merchantOrder.payments) ? merchantOrder.payments : [];
        const approved = payments.find((p: any) => p.status === 'approved');
        const rejectedOnly = payments.length > 0 && payments.every((p: any) => p.status === 'rejected' || p.status === 'cancelled');

        let newStatus = 'pending';
        if (approved) newStatus = 'completed';
        else if (rejectedOnly) newStatus = 'failed';

        const supabaseServiceMO = createClient(
          getEnv("SUPABASE_URL") ?? "",
          getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Find the order by external reference or payment id
        const { data: moOrders, error: moErr } = await supabaseServiceMO
          .from('orders')
          .select('*')
          .or(
            externalRef
              ? `id.eq.${externalRef},order_number.eq.${externalRef}`
              : 'id.eq.__none__'
          )
          .limit(1);

        if (moErr) {
          console.error("📦 Error finding order (merchant_order):", moErr);
          return new Response("OK", { status: 200, headers: corsHeaders });
        }
        if (!moOrders || moOrders.length === 0) {
          console.log("📦 No order matched merchant_order external_ref:", externalRef);
          return new Response("OK", { status: 200, headers: corsHeaders });
        }

        const order = moOrders[0];
        const { error: updErr } = await supabaseServiceMO
          .from('orders')
          .update({
            payment_status: newStatus,
            payment_id: approved?.id ?? payments[0]?.id ?? null,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        // Create/update payment record
        if (approved?.id) {
          await supabaseServiceMO
            .from('payments')
            .upsert({
              user_id: order.user_id,
              order_id: order.id,
              amount: order.total_amount,
              currency: order.currency,
              payment_method: order.payment_method,
              payment_provider: 'mercadopago',
              payment_provider_id: approved.id
            }, { onConflict: 'order_id' });
        }

        if (updErr) {
          console.error("📦 Error updating order (merchant_order):", updErr);
        }

        if (newStatus === 'completed') {
          const { data: orderItems, error: itemsError } = await supabaseServiceMO
            .from('order_items')
            .select('course_id')
            .eq('order_id', order.id);

          if (!itemsError && orderItems) {
            const enrollments = orderItems.map((item: any) => ({
              user_id: order.user_id,
              course_id: item.course_id,
              enrolled_at: new Date().toISOString(),
              progress_percentage: 0
            }));
            const { error: enrollError } = await supabaseServiceMO.from('enrollments').insert(enrollments);
            if (enrollError) {
              console.error("📦 Enrollment error (merchant_order):", enrollError);
            }
          }
        }

        console.log("📦 Merchant_order processed");
        return new Response("OK", { status: 200, headers: corsHeaders });
      } catch (e) {
        console.error("📦 Merchant_order handling error:", e);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
    }

    // Payment event path continues below
    const paymentId = paymentIdFromEvent ?? data?.id;
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

    // Find order by payment ID or external reference (retry once to avoid race conditions)
    async function findOrder() {
      const { data, error } = await supabaseService
        .from('orders')
        .select('*')
        .or(`id.eq.${payment.external_reference},order_number.eq.${payment.external_reference},payment_id.eq.${paymentId}`)
        .limit(1);
      return { data, error } as { data: any[] | null, error: any };
    }

    let { data: orders, error: orderError } = await findOrder();

    if ((!orders || orders.length === 0) && !orderError) {
      // Brief wait in case the order write hasn't propagated yet
      await new Promise((r) => setTimeout(r, 1200));
      ({ data: orders, error: orderError } = await findOrder());
    }

    if (orderError) {
      console.error("📦 Error finding order:", orderError);
      throw new Error(`Failed to find order: ${orderError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log("📦 No order found for payment:", { paymentId, external_reference: payment.external_reference });
      // Acknowledge to avoid repeated delivery retries from MercadoPago
      return new Response("OK", { status: 200, headers: corsHeaders });
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

    // Create/update payment record
    await supabaseService
      .from('payments')
      .upsert({
        user_id: order.user_id,
        order_id: order.id,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: order.payment_method,
        payment_provider: 'mercadopago',
        payment_provider_id: payment.id
      }, { onConflict: 'order_id' });

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