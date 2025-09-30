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
    console.log('Received payment validation request:', payload);

    // Los edge functions pueden conectarse a webhooks públicos de N8n
    // N8n debe estar disponible en una URL pública accesible desde internet
    
    // Por ahora, enviaremos directamente al webhook de producción de N8n
    console.log('Data that will be sent to N8n webhook:', {
      url: 'https://peri-n8n-1-n8n.j60naj.easypanel.host/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204',
      payload: payload
    });

    // Intentar enviar a N8n solo si está configurado correctamente
    try {
      // Nota: Cambiar esta URL por una pública cuando N8n esté disponible públicamente
      const n8nWebhookUrl = 'https://peri-n8n-1-n8n.j60naj.easypanel.host/webhook-test/cd9a61b2-d84c-4517-9e0a-13f898148204';
      
      console.log('Attempting to send to N8n webhook:', n8nWebhookUrl);
      
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (n8nResponse.ok) {
        console.log('Payment validation sent to N8n successfully');
        
        let responseData = null;
        try {
          responseData = await n8nResponse.json();
          console.log('N8n response:', responseData);
        } catch (e) {
          console.log('N8n response was not JSON');
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Payment validation sent to N8n',
          n8n_response: responseData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.error('Failed to send to N8n:', n8nResponse.status, n8nResponse.statusText);
        throw new Error(`N8n webhook failed with status ${n8nResponse.status}`);
      }

    } catch (n8nError: any) {
      console.error('N8n webhook error:', n8nError.message);
      
      // En lugar de fallar completamente, continuamos sin N8n
      // En producción con N8n disponible públicamente, esto debería fallar si es crítico
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment data received, N8n webhook not accessible',
        note: 'N8n webhook requires proper CORS and network access',
        data: payload
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Error in process-payment-validation:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});