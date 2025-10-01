import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, transactionId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          course_id,
          subscription_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Get user details
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', order.user_id)
      .single();

    // Determine payment type
    const hasCourses = order.order_items.some((item: any) => item.course_id);
    const hasSubscriptions = order.order_items.some((item: any) => item.subscription_id);
    const paymentType = hasSubscriptions ? 'subscription' : 'course';

    // Format date and time
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const hour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Prepare data for Google Sheets
    const sheetData = {
      ID_USUARIO: order.user_id,
      NOMBRE: profile?.full_name || 'N/A',
      CORREO: profile?.email || 'N/A',
      MONTO: order.total_amount,
      MONEDA: order.currency,
      TIPO_PAGO: paymentType,
      ID_TRANSACCION: transactionId || order.payment_id || order.id,
      METODO_PAGO: order.payment_method,
      FECHA_PAGO: date,
      HORA_PAGO: hour,
    };

    console.log('Recording payment in Google Sheets:', sheetData);

    // Send to Google Sheets via webhook (configured in external service)
    const webhookUrl = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_URL');
    
    if (webhookUrl) {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sheetData),
      });

      if (!webhookResponse.ok) {
        console.error('Failed to send to Google Sheets webhook');
      } else {
        console.log('Successfully recorded payment in Google Sheets');
      }
    } else {
      console.warn('Google Sheets webhook URL not configured');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment recorded',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error recording payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
