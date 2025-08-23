import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Trash2,
  CreditCard,
  ArrowRight,
  X,
  Plus,
  Minus
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCheckout } from "@/hooks/useCheckout";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { state, removeFromCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    isOpen: isCheckoutOpen,
    isProcessing,
    cartItems,
    totalAmount,
    openCheckout,
    closeCheckout,
    handlePaymentSuccess,
    handlePaymentError,
  } = useCheckout({
    onSuccess: (orderId) => {
      setIsCartOpen(false);
      navigate(`/payment/success?order=${orderId}`);
    },
    onError: (error) => {
      console.error('Checkout error:', error);
    }
  });

  const handleRemoveItem = async (courseId: string) => {
    try {
      await removeFromCart(courseId);
      toast({
        title: "Curso eliminado",
        description: "El curso se eliminó del carrito.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el curso del carrito.",
        variant: "destructive",
      });
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout/carrito');
  };

  const cartItemsCount = state.items.length;
  const cartTotal = state.total;

  return (
    <>
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <ShoppingCart className="w-4 h-4" />
            {cartItemsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0 text-xs"
              >
                {cartItemsCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Carrito de Compras
              {cartItemsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {cartItemsCount}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex flex-col h-full">
            {state.loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Cargando carrito...</p>
                </div>
              </div>
            ) : cartItemsCount === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Tu carrito está vacío</h3>
                  <p className="text-muted-foreground mb-4">
                    Agrega cursos a tu carrito para comenzar tu aprendizaje
                  </p>
                  <Button 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/cursos');
                    }}
                    className="w-full"
                  >
                    Explorar Cursos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-4">
                    {state.items.map((item) => (
                      <div key={item.id} className="flex space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                            {item.course.thumbnail_url ? (
                              <img
                                src={item.course.thumbnail_url}
                                alt={item.course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                                {item.course.title.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {item.course.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            por {item.course.instructor_name}
                          </p>
                          <div className="flex items-center mt-2 space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {item.course.level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.course.duration_hours}h
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.course_id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <span className="font-semibold text-sm">
                            ${item.course.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="mt-6 space-y-4 border-t pt-4">
                  {/* Cart Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({cartItemsCount} curso{cartItemsCount !== 1 ? 's' : ''}):</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Impuestos:</span>
                      <span>$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span className="text-primary">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button 
                    onClick={handleCheckout}
                    disabled={state.loading || cartItemsCount === 0}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceder al Pago
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  {/* Continue Shopping */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/cursos');
                    }}
                    className="w-full"
                  >
                    Continuar Comprando
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
        cartItems={cartItems.map(item => ({
          id: item.course_id,
          title: item.course.title,
          price: item.course.price,
          instructor_name: item.course.instructor_name,
          thumbnail_url: item.course.thumbnail_url
        }))}
        totalAmount={totalAmount}
      />
    </>
  );
}
