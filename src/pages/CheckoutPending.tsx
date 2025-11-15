import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { useOrderStatusListener } from '@/hooks/useOrderStatusListener';
import { supabase } from '@/integrations/supabase/client';

export default function CheckoutPending() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  
  // Obtener orderId de múltiples fuentes y persistirlo en sessionStorage
  const getOrderId = (): string | null => {
    // 1. Intentar desde sessionStorage (persiste en la sesión)
    const storedOrderId = sessionStorage.getItem('checkout_order_id');
    if (storedOrderId) return storedOrderId;
    
    // 2. Desde location.state
    if (location?.state?.orderId) {
      sessionStorage.setItem('checkout_order_id', location.state.orderId);
      return location.state.orderId;
    }
    
    // 3. Desde URL params
    const params = new URLSearchParams(location.search);
    const paramOrderId = params.get('orderId');
    if (paramOrderId) {
      sessionStorage.setItem('checkout_order_id', paramOrderId);
      return paramOrderId;
    }
    
    return null;
  };
  
  const orderId = getOrderId();

  // Limpiar sessionStorage cuando el pago sea exitoso o haya error
  useEffect(() => {
    if (errorMsg) {
      setIsProcessing(false);
      sessionStorage.removeItem('checkout_order_id');
    }
  }, [errorMsg]);

  // El estado exitoso es 'completed', no 'paid'
  useOrderStatusListener(orderId || '', (msg) => {
    setErrorMsg(msg);
    setIsProcessing(false);
  }, 'completed');

  // Polling como respaldo en caso de que realtime falle
  useEffect(() => {
    if (!orderId) return;

    console.log('🔄 Iniciando polling de respaldo para orden:', orderId);
    let isMounted = true;
    
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      
      try {
        const { data: order, error } = await supabase
          .from('orders')
          .select('payment_status, rejection_reason')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('❌ Error polling order status:', error);
          return;
        }

        if (!isMounted) return;

        console.log('🔍 Polling result:', { 
          status: order.payment_status, 
          rejection: order.rejection_reason,
          timestamp: new Date().toISOString()
        });
        
        if (order.payment_status === 'completed') {
          console.log('✅ Pago completado detectado por polling!');
          sessionStorage.removeItem('checkout_order_id');
          sessionStorage.removeItem('yape_checkout_state');
          sessionStorage.removeItem('yape_receipt_file');
          navigate(`/checkout/success/${orderId}`);
        } else if (['rejected', 'failed', 'error'].includes(order.payment_status)) {
          console.log('❌ Pago rechazado detectado por polling!');
          
          let errorMessage = 'No pudimos validar tu pago. Por favor revisa tu comprobante o contacta a soporte.';
          
          if (order.rejection_reason === 'comprobante_incorrecto' || order.rejection_reason === 'comprobante_invalido') {
            errorMessage = 'El comprobante no coincide con los datos de tu orden (monto, código de operación o número Yape). Por favor verifica la información y sube un comprobante correcto.';
          } else if (order.rejection_reason === 'error_validacion') {
            errorMessage = 'Hubo un problema técnico al validar tu pago. Por favor contacta a nuestro equipo de soporte para resolver este inconveniente.';
          } else if (order.rejection_reason === 'tiempo_expirado') {
            errorMessage = 'El tiempo para validar tu pago ha expirado. Por favor realiza una nueva compra con un comprobante válido.';
          } else if (order.rejection_reason === 'monto_incorrecto') {
            errorMessage = 'El monto del comprobante no coincide con el monto de la orden.';
          } else if (order.rejection_reason === 'comprobante_usado') {
            errorMessage = 'Este comprobante ya ha sido usado en otra orden.';
          } else if (order.rejection_reason === 'comprobante_ilegible') {
            errorMessage = 'No se puede leer el comprobante. Por favor, sube una imagen más clara.';
          } else if (order.rejection_reason === 'metodo_incorrecto') {
            errorMessage = 'El método de pago usado no coincide con el solicitado.';
          } else if (order.rejection_reason) {
            errorMessage = `Error: ${order.rejection_reason}`;
          }
          
          setErrorMsg(errorMessage);
          setIsProcessing(false);
        } else {
          console.log('⏳ Orden aún en estado:', order.payment_status);
        }
      } catch (error) {
        console.error('❌ Error en polling:', error);
      }
    }, 2000);

    return () => {
      console.log('🛑 Limpiando polling interval');
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [orderId, navigate]);

  // Si no hay orderId después de intentar obtenerlo, redirigir
  useEffect(() => {
    if (!orderId && isProcessing) {
      console.log('❌ No orderId found, redirecting to courses');
      navigate('/cursos');
    }
  }, [orderId, navigate, isProcessing]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Error Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-red-600 mb-2">Pago Rechazado</h1>
            <p className="text-lg text-muted-foreground">
              {errorMsg}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>¿Qué puedes hacer?</CardTitle>
              <CardDescription>
                Tu pago no pudo ser validado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm">Revisa tu comprobante</h4>
                  <p className="text-xs text-muted-foreground">
                    Verifica que el monto, código de operación y número Yape coincidan con tu orden.
                  </p>
                </div>

                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm">Intenta nuevamente</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Puedes realizar el pago nuevamente con un comprobante correcto
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      sessionStorage.removeItem('checkout_order_id');
                      navigate('/cursos');
                    }}
                    className="w-full"
                  >
                    Volver a los Cursos
                  </Button>
                </div>

                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm">Contacta soporte</h4>
                  <p className="text-xs text-muted-foreground">
                    Si crees que es un error, contacta a nuestro equipo de soporte
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Loading Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Procesando tu Pago</h1>
          <p className="text-lg text-muted-foreground">
            Estamos validando tu comprobante de pago, esto puede tomar unos minutos...
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Validación en Proceso</CardTitle>
            <CardDescription>
              Tu orden está siendo procesada y validada automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <h4 className="font-medium text-sm text-blue-800">Verificando comprobante</h4>
                </div>
                <p className="text-xs text-blue-600">
                  Nuestro sistema está validando que el comprobante coincida con los datos de tu orden
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Te notificaremos automáticamente</h4>
                <p className="text-xs text-muted-foreground">
                  Una vez validado el pago, serás redirigido automáticamente y recibirás acceso a tus cursos
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Mantén esta ventana abierta</h4>
                <p className="text-xs text-muted-foreground">
                  El proceso es automático, no cierres esta página mientras se procesa tu pago
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-center text-sm text-muted-foreground">
                Si tienes dudas puedes revisar tu historial de órdenes
              </p>
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => navigate('/ordenes')}
                className="w-full mt-2"
              >
                Ver Historial de Órdenes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Tiempo estimado de validación</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Validación automática: 1-3 minutos</li>
                <li>• Máximo tiempo de espera: 10 minutos</li>
                <li>• No necesitas hacer nada más</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}