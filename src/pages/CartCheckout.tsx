import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Checkout from '@/components/checkout/Checkout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

export default function CartCheckout() {
  const navigate = useNavigate();
  const { state: cartState } = useCart();
  const { user } = useAuth();

  if (!user) {
    console.log('🚫 CartCheckout: User not authenticated, redirecting to auth');
    navigate('/auth');
    return null;
  }

  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/carrito')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al carrito
            </Button>
          </div>
          
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Carrito vacío</h1>
            <p className="text-muted-foreground mb-6">
              No tienes elementos en tu carrito para procesar
            </p>
            <Button onClick={() => navigate('/cursos')}>
              Explorar cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/carrito')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al carrito
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">
            Completa tu compra de {cartState.items.length} curso{cartState.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Checkout mode="cart" />
      </div>
    </div>
  );
}
