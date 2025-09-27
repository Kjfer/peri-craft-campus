import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: cartState, removeFromCart, isInCart } = useCart();
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">Inicia sesión para ver tu carrito</h2>
              <p className="text-muted-foreground mb-6">
                Necesitas una cuenta para agregar cursos al carrito
              </p>
              <Button onClick={() => navigate('/auth')}>
                Iniciar Sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (cartState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Cargando carrito...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
              <p className="text-muted-foreground mb-6">
                Explora nuestros cursos y agrega los que te interesen
              </p>
              <Button onClick={() => navigate('/cursos')}>
                Explorar Cursos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleRemoveFromCart = async (courseId: string) => {
    try {
      await removeFromCart(courseId);
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el curso del carrito",
        variant: "destructive"
      });
    }
  };

  const handleCheckout = () => {
    navigate('/checkout/carrito');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Mi Carrito</h1>
          <p className="text-muted-foreground">
            {cartState.items.length} curso{cartState.items.length !== 1 ? 's' : ''} en tu carrito
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartState.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-24 h-16 bg-gray-200 rounded flex-shrink-0">
                      {item.course?.thumbnail_url ? (
                        <img 
                          src={item.course.thumbnail_url} 
                          alt={item.course.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">
                          📚
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        <Link 
                          to={`/curso/${item.course_id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {item.course?.title}
                        </Link>
                      </h3>
                      <p className="text-muted-foreground mb-2">
                        {item.course?.instructor_name}
                      </p>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary">{item.course?.level}</Badge>
                        <Badge variant="outline">
                          {item.course?.duration_hours}h
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold mb-2">
                        ${item.course?.price?.toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromCart(item.course_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {cartState.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="truncate mr-2">
                        {item.course?.title}
                      </span>
                      <span>${item.course?.price?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${cartState.total.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                >
                  Proceder al Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/cursos')}
                >
                  Seguir Comprando
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}