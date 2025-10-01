import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function env(key: string): string | undefined {
  try {
    // @ts-ignore
    return typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined;
  } catch {
    return undefined;
  }
}

const PAYPAL_ENV = (env('PAYPAL_ENV') || 'sandbox').toLowerCase();
const PAYPAL_BASE = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const clientId = env('PAYPAL_CLIENT_ID') || '';
  const clientSecret = env('PAYPAL_CLIENT_SECRET') || '';
  if (!clientId || !clientSecret) throw new Error('Missing PayPal credentials');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('PayPal OAuth error:', txt);
    throw new Error(`PayPal OAuth failed: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

interface CartItem {
  id: string;
  course_id?: string;
  subscription_id?: string;
  title: string;
  price: number;
  instructor_name?: string;
  thumbnail_url?: string;
  type?: 'course' | 'subscription';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) throw new Error('Missing authorization header');

    const supabase = createClient(
      env('SUPABASE_URL') || '',
      env('SUPABASE_ANON_KEY') || ''
    );

    const token = auth.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error('Invalid auth token');
    const user = userData.user;

    const body = await req.json();
    const action: 'create' | 'capture' = body.action;

    const svc = createClient(
      env('SUPABASE_URL') || '',
      env('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    if (action === 'create') {
      const cartItems: CartItem[] = Array.isArray(body.cartItems) ? body.cartItems : [];
      const totalAmount: number = Number(body.totalAmount || 0);
      if (!cartItems.length || !totalAmount) throw new Error('Invalid cart or amount');

      // Create order in DB (pending)
      const { data: order, error: orderErr } = await svc
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          currency: 'USD',
          payment_method: 'paypal',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderErr || !order) throw new Error(`DB order error: ${orderErr?.message}`);

      const orderItems = cartItems.map(ci => ({ 
        order_id: order.id, 
        course_id: ci.course_id || null,
        subscription_id: ci.subscription_id || null,
        price: ci.price 
      }));
      const { error: itemsErr } = await svc.from('order_items').insert(orderItems);
      if (itemsErr) throw new Error(`DB order_items error: ${itemsErr.message}`);

      // Create PayPal order
      const accessToken = await getPayPalAccessToken();
      const ppRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: order.id,
              description: `Peri Institute - ${cartItems.length} curso(s)`,
              amount: {
                currency_code: 'USD',
                value: totalAmount.toFixed(2)
              }
            }
          ]
        })
      });

      if (!ppRes.ok) {
        const txt = await ppRes.text();
        console.error('PayPal create order error:', txt);
        throw new Error('Failed to create PayPal order');
      }
      const ppData = await ppRes.json();

      return new Response(JSON.stringify({
        success: true,
        orderId: order.id,
        paypalOrderId: ppData.id,
        dbOrderId: order.id
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'capture') {
      const paypalOrderId: string = body.orderID;
      const dbOrderId: string = body.dbOrderId;
      if (!paypalOrderId || !dbOrderId) throw new Error('Missing order identifiers');

      const accessToken = await getPayPalAccessToken();
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!capRes.ok) {
        const txt = await capRes.text();
        console.error('PayPal capture error:', txt);
        throw new Error('Failed to capture PayPal order');
      }
      const capData = await capRes.json();
      const status = capData.status;

      if (status !== 'COMPLETED') {
        return new Response(JSON.stringify({ success: false, message: 'Payment not completed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      // Update order and create enrollments/subscriptions
      const { data: orderWithItems, error: fetchErr } = await svc
        .from('orders')
        .select(`id, user_id, total_amount, currency, payment_method, order_items (course_id, subscription_id)`)
        .eq('id', dbOrderId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (fetchErr || !orderWithItems) throw new Error('Order not found');

      const { error: updErr } = await svc
        .from('orders')
        .update({ payment_status: 'completed', payment_id: paypalOrderId })
        .eq('id', dbOrderId);
      if (updErr) console.error('Order update error:', updErr);

      // Create enrollments for courses
      if (orderWithItems?.order_items?.length) {
        const courseItems = orderWithItems.order_items.filter((it: any) => it.course_id);
        if (courseItems.length > 0) {
          const enrollments = courseItems.map((it: any) => ({
            user_id: user.id,
            course_id: it.course_id,
            enrolled_at: new Date().toISOString(),
            progress_percentage: 0
          }));
          const { error: enrErr } = await svc.from('enrollments').upsert(enrollments, { onConflict: 'user_id,course_id' });
          if (enrErr) console.error('Enrollments insert error:', enrErr);
        }

        // Create subscriptions
        const subscriptionItems = orderWithItems.order_items.filter((it: any) => it.subscription_id);
        for (const item of subscriptionItems) {
          const { data: plan } = await svc
            .from('plans')
            .select('duration_months')
            .eq('id', item.subscription_id)
            .single();

          if (plan) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + plan.duration_months);

            await svc.from('user_subscriptions').insert({
              user_id: user.id,
              plan_id: item.subscription_id,
              start_date: new Date().toISOString(),
              end_date: endDate.toISOString(),
              status: 'active',
              payment_id: paypalOrderId,
            });
          }
        }
      }

      // Record payment
      await svc.from('payments').insert({
        user_id: user.id,
        order_id: dbOrderId,
        amount: orderWithItems.total_amount,
        currency: orderWithItems.currency,
        payment_method: 'paypal',
        payment_provider: 'paypal',
        payment_provider_id: paypalOrderId,
      });

      // Record in Google Sheets
      await svc.functions.invoke('record-payment-sheets', {
        body: { orderId: dbOrderId, transactionId: paypalOrderId }
      });

      return new Response(JSON.stringify({ success: true, orderId: dbOrderId, paypalOrderId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unsupported action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  } catch (e: any) {
    console.error('PayPal function error:', e);
    return new Response(JSON.stringify({ success: false, error: e.message || 'Unexpected error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
