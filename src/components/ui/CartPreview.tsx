import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';

export default function CartPreview() {
  const { state: cartState, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout/carrito');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="w-5 h-5" />
          {cartState.items.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {cartState.items.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full max-h-screen">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Mi Carrito
          </SheetTitle>
          <SheetDescription>
            {cartState.items.length === 0 
              ? "Tu carrito está vacío" 
              : `${cartState.items.length} curso${cartState.items.length > 1 ? 's' : ''} en tu carrito`
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 min-h-0 py-4">
          {cartState.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Tu carrito está vacío</p>
                <p className="text-sm">Agrega algunos cursos para comenzar</p>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 min-h-0 pr-4">
                <div className="space-y-4">
                  {cartState.items.map((item) => (
                    <Card key={item.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          {item.course.thumbnail_url && (
                            <img
                              src={item.course.thumbnail_url}
                              alt={item.course.title}
                              className="w-16 h-16 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                              {item.course.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {item.course.instructor_name}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary">
                                {formatPrice(item.course.price)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.course_id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-4 space-y-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg text-primary">
                    {formatPrice(cartState.total)}
                  </span>
                </div>
                
                <Button 
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={cartState.loading || cartState.items.length === 0}
                >
                  {cartState.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Proceder al Pago
                      <ShoppingCart className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}