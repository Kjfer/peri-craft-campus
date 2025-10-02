import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función para obtener el access token de OAuth2
async function getAccessToken() {
  const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_SHEETS_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google OAuth2 credentials');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Función para agregar fila a Google Sheets
async function appendToSheet(accessToken: string, spreadsheetId: string, sheetName: string, values: any[]) {
  const range = `${sheetName}!A:J`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to append to sheet: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Función record-payment-sheets ejecutándose...');
    
    const { orderId, transactionId } = await req.json();
    console.log('📝 Datos recibidos:', { orderId, transactionId });

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Verificar configuración de Google Sheets
    const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID');
    const sheetName = Deno.env.get('GOOGLE_SHEETS_SHEET_NAME') || 'Pagos';
    const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GOOGLE_SHEETS_REFRESH_TOKEN');

    console.log('🔧 Verificando configuración de Google Sheets:');
    console.log(`   SPREADSHEET_ID: ${spreadsheetId ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   CLIENT_ID: ${clientId ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   CLIENT_SECRET: ${clientSecret ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   REFRESH_TOKEN: ${refreshToken ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   SHEET_NAME: ${sheetName}`);

    if (!spreadsheetId) {
      console.warn('⚠️ Google Sheets SPREADSHEET_ID no configurado, saltando registro');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment processed (Google Sheets not configured)',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!clientId || !clientSecret || !refreshToken) {
      console.warn('⚠️ Credenciales OAuth2 de Google no configuradas, saltando registro');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment processed (Google OAuth2 not configured)',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client
    console.log('🔗 Conectando a Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order details
    console.log(`🔍 Buscando orden: ${orderId}`);
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
      console.error('❌ Error buscando orden:', orderError);
      throw new Error('Order not found');
    }
    
    console.log('✅ Orden encontrada:', { 
      id: order.id, 
      user_id: order.user_id, 
      total_amount: order.total_amount,
      status: order.status,
      payment_method: order.payment_method
    });

    // Get user details
    console.log(`👤 Buscando perfil de usuario: ${order.user_id}`);
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', order.user_id)
      .single();
      
    console.log('👤 Perfil encontrado:', profile);

    // Determine payment type
    const hasCourses = order.order_items.some((item: any) => item.course_id);
    const hasSubscriptions = order.order_items.some((item: any) => item.subscription_id);
    const paymentType = hasSubscriptions ? 'subscription' : 'course';

    // Format date and time
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const hour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log('📊 Preparando datos para Google Sheets:', {
      orderId,
      userId: order.user_id,
      amount: order.total_amount,
      paymentType,
      date,
      hour,
    });

    try {
      // Obtener access token
      console.log('🔑 Obteniendo access token de Google...');
      const accessToken = await getAccessToken();
      console.log('✅ Access token obtenido exitosamente');

      // Preparar datos para la fila
      const rowValues = [
        order.user_id,
        profile?.full_name || 'N/A',
        profile?.email || 'N/A',
        order.total_amount,
        order.currency,
        paymentType,
        transactionId || order.payment_id || order.id,
        order.payment_method,
        date,
        hour,
      ];

      console.log('📋 Datos de la fila a insertar:', rowValues);

      // Agregar a Google Sheets
      console.log('📤 Enviando datos a Google Sheets...');
      const sheetResult = await appendToSheet(accessToken, spreadsheetId, sheetName, rowValues);
      console.log('✅ Datos enviados exitosamente a Google Sheets:', sheetResult);

    } catch (sheetError) {
      console.error('❌ Error registrando en Google Sheets:', sheetError);
      // No lanzar error para no interrumpir el flujo de pago
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
    console.error('❌ Error general en record-payment-sheets:', error);
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
