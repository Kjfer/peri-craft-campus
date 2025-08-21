import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function getEnv(key: string): string | undefined {
  try {
    // @ts-ignore
    if (typeof Deno !== 'undefined' && Deno?.env?.get) {
      // @ts-ignore
      return Deno.env.get(key);
    }
  } catch (_) {}
  return undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreferenceRequest {
  cartItems: Array<{ title: string; price: number }>;
  totalAmount: number;
  orderId: string;
  paymentData?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      getEnv('SUPABASE_URL') ?? '',
      getEnv('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = getEnv('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const body = (await req.json()) as PreferenceRequest;
    const { cartItems, orderId, paymentData } = body;

    const isSandbox = accessToken.startsWith('TEST-');
    const providedEmail = paymentData?.user?.email as string | undefined;
    const payerEmail = isSandbox
      ? (providedEmail && providedEmail.endsWith('@testuser.com')
          ? providedEmail
          : `test_user_${Math.floor(Math.random()*100000)}@testuser.com`)
      : (providedEmail || 'buyer@example.com');

    const preference = {
      items: cartItems.map((item) => ({
        title: item.title,
        quantity: 1,
        unit_price: parseFloat(((item.price || 0) * 3.75).toFixed(2)),
        currency_id: 'PEN',
      })),
      payer: {
        email: payerEmail,
        name: paymentData?.user?.name || 'Test User',
      },
      external_reference: orderId,
      notification_url: `${getEnv('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/success/${orderId}`,
        failure: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/failed`,
        pending: `https://idjmabhvzupcdygguqzm.supabase.co/checkout/pending`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_methods: [
          { id: 'yape' },
          { id: 'plin' },
        ],
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' },
          { id: 'bank_transfer' },
        ],
        default_payment_method_id: 'visa',
        installments: 1,
      },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MercadoPago API error (preference):', errorText);
      return new Response(JSON.stringify({ success: false, message: 'MercadoPago API error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const isSandboxEnv = accessToken.startsWith('TEST-');

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: data.id,
        paymentUrl: isSandboxEnv && data.sandbox_init_point ? data.sandbox_init_point : data.init_point,
        message: 'Redirecting to MercadoPago',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('mp-preference error:', e);
    return new Response(JSON.stringify({ success: false, message: e?.message || 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
