import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para escuchar el estado de una orden y redirigir según validación de pago.
 * @param orderId string
 * @param onError función opcional para manejar error/rechazo
 */
export function useOrderStatusListener(orderId: string, onError?: (msg: string) => void, successStatus: string = 'completed') {
  const navigate = useNavigate();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      console.log('⚠️ useOrderStatusListener: No orderId provided');
      return;
    }
    
    hasHandledRef.current = false;
    console.log('🔄 Setting up realtime listener for order:', orderId);
    console.log('🎯 Listening for status changes to:', successStatus);
    
    // Subscribe to realtime changes with optimized config
    const channel = supabase
      .channel(`order-status-${orderId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: orderId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (hasHandledRef.current) {
            console.log('⏭️ Status change already handled, skipping...');
            return;
          }

          const oldStatus = payload.old?.payment_status;
          const newStatus = payload.new.payment_status;
          const rejectionReason = payload.new.rejection_reason;
          
          console.log('🔔 Payment status UPDATE received:', { 
            orderId, 
            oldStatus,
            newStatus, 
            rejectionReason,
            timestamp: new Date().toISOString()
          });
          
          if (newStatus === successStatus) {
            hasHandledRef.current = true;
            console.log('✅ Payment successful! Redirecting to success page...');
            sessionStorage.removeItem('checkout_order_id');
            sessionStorage.removeItem('yape_checkout_state');
            sessionStorage.removeItem('yape_receipt_file');
            sessionStorage.setItem('payment_handled', 'true');
            navigate(`/checkout/success/${orderId}`);
          } else if (newStatus === 'rejected' || newStatus === 'failed' || newStatus === 'error') {
            hasHandledRef.current = true;
            console.log('❌ Payment rejected/failed! Calling onError callback...', { 
              newStatus, 
              rejectionReason,
              hasOnError: !!onError 
            });
            
            if (onError) {
              let errorMessage = 'No pudimos validar tu pago. Por favor revisa tu comprobante o contacta a soporte.';
              
              if (rejectionReason === 'comprobante_incorrecto' || rejectionReason === 'comprobante_invalido') {
                errorMessage = 'El comprobante no coincide con los datos de tu orden (monto, código de operación o número Yape). Por favor verifica la información y sube un comprobante correcto.';
              } else if (rejectionReason === 'error_validacion') {
                errorMessage = 'Hubo un problema técnico al validar tu pago. Por favor contacta a nuestro equipo de soporte para resolver este inconveniente.';
              } else if (rejectionReason === 'tiempo_expirado') {
                errorMessage = 'El tiempo para validar tu pago ha expirado. Por favor realiza una nueva compra con un comprobante válido.';
              } else if (rejectionReason === 'monto_incorrecto') {
                errorMessage = 'El monto del comprobante no coincide con el monto de la orden.';
              } else if (rejectionReason === 'comprobante_usado') {
                errorMessage = 'Este comprobante ya ha sido usado en otra orden.';
              } else if (rejectionReason === 'comprobante_ilegible') {
                errorMessage = 'No se puede leer el comprobante. Por favor, sube una imagen más clara.';
              } else if (rejectionReason === 'metodo_incorrecto') {
                errorMessage = 'El método de pago usado no coincide con el solicitado.';
              } else if (rejectionReason) {
                errorMessage = `Error: ${rejectionReason}`;
              }
              
              sessionStorage.setItem('payment_handled', 'true');
              console.log('📝 Executing onError callback with message:', errorMessage);
              onError(errorMessage);
              console.log('✅ onError callback executed successfully');
            }
          } else {
            console.log('ℹ️ Status changed but not to terminal state:', newStatus);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', { 
          orderId, 
          status, 
          timestamp: new Date().toISOString() 
        });
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates for order:', orderId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error for order:', orderId);
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime subscription timed out for order:', orderId);
        } else if (status === 'CLOSED') {
          console.log('🔒 Realtime channel closed for order:', orderId);
        }
      });
      
    // Log initial connection
    console.log('🎯 Realtime channel created and subscribing for order:', orderId);
    
    return () => {
      console.log('🔌 Cleaning up realtime channel for order:', orderId);
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate, onError, successStatus]);
}
