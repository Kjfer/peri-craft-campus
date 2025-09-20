import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: cartState, clearCart } = useCart();
  const { toast } = useToast();

  const openCheckout = () => {
    console.log('🛒 Opening checkout...', { user: !!user, cartItems: cartState.items.length });
    
    if (!user) {
      console.log('🚫 User not authenticated, redirecting to login');
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para realizar una compra.",
        variant: "destructive",
      });
      // Redirect to auth page
      navigate('/auth');
      return;
    }

    if (cartState.items.length === 0) {
      console.log('🛒 Cart is empty');
      toast({
        title: "Carrito vacío",
        description: "Agrega cursos al carrito antes de proceder al checkout.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Navigating to cart checkout');
    // Navigate to cart checkout page
    navigate('/checkout/carrito');
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
