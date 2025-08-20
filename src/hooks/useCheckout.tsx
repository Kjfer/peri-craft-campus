import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

export interface CheckoutOptions {
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
}

export function useCheckout(options: CheckoutOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user } = useAuth();
  const { state: cartState, clearCart } = useCart();
  const { toast } = useToast();

  const openCheckout = () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para realizar una compra.",
        variant: "destructive",
      });
      return;
    }

    if (cartState.items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega cursos al carrito antes de proceder al checkout.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to cart checkout page
    window.location.href = '/checkout/carrito';
  };

  const closeCheckout = () => {
    if (!isProcessing) {
      setIsOpen(false);
    }
  };

  const handlePaymentSuccess = async (orderId: string) => {
    try {
      setIsProcessing(true);
      
      // Clear the cart
      await clearCart();
      
      // Close checkout modal
      setIsOpen(false);
      
      // Call success callback
      if (options.onSuccess) {
        options.onSuccess(orderId);
      }
      
      toast({
        title: "¡Compra exitosa!",
        description: "Tu pago se procesó correctamente.",
      });
      
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al procesar tu compra.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    if (options.onError) {
      options.onError(error);
    }
    
    toast({
      title: "Error en el pago",
      description: error || "No se pudo procesar el pago.",
      variant: "destructive",
    });
  };

  return {
    isOpen,
    isProcessing,
    cartItems: cartState.items,
    totalAmount: cartState.total,
    openCheckout,
    closeCheckout,
    handlePaymentSuccess,
    handlePaymentError,
  };
}
