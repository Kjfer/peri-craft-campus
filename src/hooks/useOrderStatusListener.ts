import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para escuchar el estado de una orden y redirigir según validación de pago.
 * @param orderId string
 * @param onError función opcional para manejar error/rechazo
 */
export function useOrderStatusListener(orderId: string, onError?: (msg: string) => void, successStatus: string = 'completed') {
  const navigate = useNavigate();

  useEffect(() => {
    if (!orderId) {
      console.log('⚠️ useOrderStatusListener: No orderId provided');
      return;
    }
    
    console.log('🔄 Setting up realtime listener for order:', orderId);
    
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new.payment_status;
          const rejectionReason = payload.new.rejection_reason;
          
          console.log('🔄 Payment status changed:', { 
            orderId, 
            newStatus, 
            rejectionReason,
            oldStatus: payload.old?.payment_status,
            fullPayload: payload.new 
          });
          
          if (newStatus === successStatus) {
            console.log('✅ Payment successful, redirecting to success page');
            navigate(`/checkout/success/${orderId}`);
          } else if (newStatus === 'rejected' || newStatus === 'failed' || newStatus === 'error') {
            console.log('❌ Payment rejected/failed:', { newStatus, rejectionReason });
            if (onError) {
              let errorMessage = 'No pudimos validar tu pago. Por favor revisa tu comprobante o contacta a soporte.';
              
              if (rejectionReason === 'comprobante_incorrecto' || rejectionReason === 'comprobante_invalido') {
                errorMessage = 'El comprobante no coincide con los datos de tu orden (monto, código de operación o número Yape). Por favor verifica la información y sube un comprobante correcto.';
              } else if (rejectionReason === 'error_validacion') {
                errorMessage = 'Hubo un problema técnico al validar tu pago. Por favor contacta a nuestro equipo de soporte para resolver este inconveniente.';
              } else if (rejectionReason === 'tiempo_expirado') {
                errorMessage = 'El tiempo para validar tu pago ha expirado. Por favor realiza una nueva compra con un comprobante válido.';
              } else if (rejectionReason) {
                errorMessage = `Error: ${rejectionReason}`;
              }
              
              console.log('📝 Calling onError with message:', errorMessage);
              onError(errorMessage);
            } else {
              console.log('⚠️ No onError callback provided');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', { orderId, status });
      });
      
    // Log initial connection
    console.log('🎯 Realtime channel created for order:', orderId);
    
    return () => {
      console.log('🔌 Removing realtime channel for order:', orderId);
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate, onError, successStatus]);
}
