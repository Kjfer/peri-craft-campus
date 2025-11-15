import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('📨 Received payment callback from n8n:', payload);

    const { orderId, status, rejectionReason } = payload;

    // Validate required fields
    if (!orderId || !status) {
      console.error('❌ Missing required fields:', { orderId, status });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing orderId or status' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      console.error('❌ Invalid status:', status);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Status must be either "approved" or "rejected"' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔄 Processing ${status} status for order ${orderId}`);

    // Map n8n status to our payment_status
    const paymentStatus = status === 'approved' ? 'completed' : 'rejected';

    // Update the order
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    // Add rejection reason if provided
    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    console.log('📝 Updating order with:', updateData);

    const { data, error } = await supabaseClient
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }

    console.log('✅ Order updated successfully:', data);

    // If approved, the trigger process_completed_order will automatically:
    // 1. Create enrollments for courses
    // 2. Create user_subscriptions for subscriptions
    // 3. Create payment record via create_payment_on_order_completion trigger

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Payment ${status} for order ${orderId}`,
      order: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in n8n-payment-callback:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
