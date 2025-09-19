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
    if (!orderId) return;
    const channel = supabase
      .channel('order-status')
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
          if (newStatus === successStatus) {
            navigate(`/checkout/success/${orderId}`);
          } else if (newStatus === 'rejected' || newStatus === 'error') {
            if (onError) {
              const rejectionReason = payload.new.rejection_reason;
              let errorMessage = 'No pudimos validar tu pago. Por favor revisa tu comprobante o contacta a soporte.';
              
              if (rejectionReason === 'comprobante_incorrecto') {
                errorMessage = 'El comprobante no coincide con los datos de tu orden (monto, código de operación o número Yape). Por favor verifica la información y sube un comprobante correcto.';
              } else if (rejectionReason === 'error_validacion') {
                errorMessage = 'Hubo un problema técnico al validar tu pago. Por favor contacta a nuestro equipo de soporte para resolver este inconveniente.';
              }
              
              onError(errorMessage);
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate, onError, successStatus]);
}
