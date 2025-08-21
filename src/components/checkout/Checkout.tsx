import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Smartphone, DollarSign, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { checkoutService, CheckoutItem } from '@/lib/checkoutService';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutProps {
  mode?: 'cart' | 'single';
  courseId?: string;
  courseData?: any;
}

export default function Checkout({ mode = 'cart', courseId, courseData }: CheckoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state: cartState, clearCart } = useCart();
  const { toast } = useToast();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select_payment' | 'processing' | 'manual_confirmation' | 'completed' | 'paypal'>('select_payment');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState<string>('');
  const [paypalDbOrderId, setPaypalDbOrderId] = useState<string | null>(null);

  // PayPal configuration
  const paypalOptions = {
    clientId: "AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R",
    currency: "USD",
    intent: "capture" as const
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
    try {
      const methods = await checkoutService.getAvailablePaymentMethods();
      setAvailablePaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const getCheckoutItems = (): CheckoutItem[] => {
    if (mode === 'single' && courseId && courseData) {
      return [{
        course_id: courseId,
        course: {
          id: courseData.id,
          title: courseData.title,
          price: courseData.price || 0,
          thumbnail_url: courseData.thumbnail_url,
          instructor_name: courseData.instructor_name,
          level: courseData.level,
          duration_hours: courseData.duration_hours || 0
        }
      }];
    }

    return cartState.items.map(item => ({
      course_id: item.course_id,
      course: item.course
    }));
  };

  const calculateTotal = () => {
    const items = getCheckoutItems();
    const usdTotal = items.reduce((sum, item) => sum + (item.course?.price || 0), 0);
    
    if (selectedPaymentMethod === 'mercadopago') {
      return {
        amount: checkoutService.convertToPEN(usdTotal),
        currency: 'PEN'
      };
    }
    
    return {
      amount: usdTotal,
      currency: 'USD'
    };
  };

  const handleStartCheckout = async () => {
    if (!selectedPaymentMethod) {
      setError('Por favor selecciona un método de pago');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const items = getCheckoutItems();
      
      if (items.length === 0) {
        throw new Error('No hay elementos para procesar');
      }

  // Map frontend method ids to backend expected values
  let backendMethod = selectedPaymentMethod;
  if (selectedPaymentMethod === 'google_pay') backendMethod = 'googlepay';

  // For PayPal, use embedded PayPal buttons flow
  if (backendMethod === 'paypal') {
    setStep('paypal');
    return;
  }

      const result = await checkoutService.startCheckoutFromCart(items, backendMethod);
      
      if (result.success && result.paymentUrl) {
        // Redirect to payment URL for MercadoPago methods
        window.location.href = result.paymentUrl;
        return;
      }
      
      setCurrentOrder(result.order);

      // For immediate payment methods (Google Pay), mark as completed
      if (backendMethod === 'googlepay') {
        setStep('completed');
        if (mode === 'cart') await clearCart();
      } else {
        // For other methods, process normally
        setStep('processing');
        toast({
          title: 'Pago',
          description: `${selectedPaymentMethod} será implementado próximamente`,
          variant: 'default'
        });
        setStep('select_payment');
      }

    } catch (error: any) {
      setError(error.message || 'Error al procesar el checkout');
      toast({
        title: "Error",
        description: error.message || 'Error al procesar el checkout',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtherPaymentMethods = async (checkoutResult: any) => {
  // Fallback handler: main flow already handles paymentUrl and success.
  console.log('handleOtherPaymentMethods fallback', checkoutResult);
  };

  const handleConfirmManualPayment = async () => {
    if (!transactionId.trim()) {
      setError('Por favor ingresa el ID de transacción');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await checkoutService.confirmManualPayment(
        currentOrder.id,
        transactionId,
        selectedPaymentMethod as 'yape' | 'plin'
      );

      if (mode === 'cart') {
        await clearCart();
      }

      setStep('completed');
      
      toast({
        title: "¡Pago confirmado!",
        description: "Tu pago ha sido procesado exitosamente",
        variant: "default"
      });

    } catch (error: any) {
      setError(error.message || 'Error al confirmar el pago');
      toast({
        title: "Error",
        description: error.message || 'Error al confirmar el pago',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: any) => {
    switch (method.id) {
      case 'mercadopago':
        return <DollarSign className="w-5 h-5" />;
      case 'googlepay':
        return <Smartphone className="w-5 h-5" />;
      case 'paypal':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const items = getCheckoutItems();
  const total = calculateTotal();

  if (step === 'completed') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">¡Pago Completado!</CardTitle>
            <CardDescription>
              Tu pago ha sido procesado exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Orden: <strong>{currentOrder?.order_number}</strong></p>
            <p>Ya tienes acceso a tus cursos</p>
            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={() => navigate('/dashboard')}>
                Ir a Mis Cursos
              </Button>
              <Button variant="outline" onClick={() => navigate('/cursos')}>
                Seguir Explorando
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Resumen de la orden */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen de la orden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.course_id} className="flex items-center space-x-4">
                  <div className="w-16 h-12 bg-gray-200 rounded flex-shrink-0">
                    {item.course?.thumbnail_url ? (
                      <img 
                        src={item.course.thumbnail_url} 
                        alt={item.course.title}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        📚
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.course?.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.course?.instructor_name}
                    </p>
                  </div>
                   <div className="text-right">
                     <p className="font-medium">
                       {checkoutService.formatPrice(
                         selectedPaymentMethod === 'mercadopago'
                           ? checkoutService.convertToPEN(item.course?.price || 0)
                           : item.course?.price || 0,
                         selectedPaymentMethod === 'mercadopago' ? 'PEN' : 'USD'
                       )}
                     </p>
                   </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>{checkoutService.formatPrice(total.amount, total.currency)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulario de pago */}
        <div>
          {step === 'select_payment' && (
            <Card>
              <CardHeader>
                <CardTitle>Método de pago</CardTitle>
                <CardDescription>
                  Selecciona cómo deseas pagar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {availablePaymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <div className="flex items-center space-x-3">
                        {getPaymentMethodIcon(method)}
                         <div className="flex-1">
                           <p className="font-medium">{method.name}</p>
                           {method.description && (
                             <p className="text-sm text-muted-foreground">
                               {method.description}
                             </p>
                           )}
                         </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedPaymentMethod === method.id
                            ? 'border-primary bg-primary'
                            : 'border-gray-300'
                        }`} />
                      </div>
                    </div>
                  ))}
                   {/* Hint: show help if MercadoPago not available but user profile not Peru */}
                   {!(availablePaymentMethods.some(m => m.id === 'mercadopago')) && (
                     <div className="mt-3 p-3 border rounded bg-yellow-50">
                       <p className="text-sm">¿Quieres pagar con MercadoPago (Yape, tarjetas)? Este método está disponible solo para usuarios en Perú.</p>
                       <div className="mt-2 flex gap-2">
                         <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>Editar perfil</Button>
                         <Button size="sm" onClick={() => navigate('/auth')}>Ir a mi cuenta</Button>
                       </div>
                     </div>
                   )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleStartCheckout}
                  disabled={!selectedPaymentMethod || loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Proceder al pago
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 'paypal' && (
            <Card>
              <CardHeader>
                <CardTitle>Pagar con PayPal</CardTitle>
                <CardDescription>
                  Serás redirigido a PayPal para completar el pago.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PayPalScriptProvider options={paypalOptions}>
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' }}
                    createOrder={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke('paypal', {
                          body: {
                            action: 'create',
                            cartItems: items.map(i => ({
                              id: i.course_id,
                              title: i.course?.title,
                              price: i.course?.price,
                              instructor_name: i.course?.instructor_name,
                              thumbnail_url: i.course?.thumbnail_url
                            })),
                            totalAmount: items.reduce((sum, i) => sum + (i.course?.price || 0), 0)
                          }
                        });
                        if (error || !data?.paypalOrderId) throw new Error(error?.message || 'No se pudo crear la orden de PayPal');
                        setPaypalDbOrderId(data.dbOrderId);
                        return data.paypalOrderId as string;
                      } catch (e: any) {
                        console.error('PayPal createOrder error:', e);
                        toast({ title: 'Error de PayPal', description: e.message || 'No se pudo crear la orden.', variant: 'destructive' });
                        throw e;
                      }
                    }}
                    onApprove={async (data) => {
                      try {
                        const { data: cap, error } = await supabase.functions.invoke('paypal', {
                          body: {
                            action: 'capture',
                            orderID: data.orderID,
                            dbOrderId: paypalDbOrderId
                          }
                        });
                        if (error || !cap?.success) throw new Error(error?.message || cap?.error || 'No se pudo completar el pago con PayPal');
                        toast({ title: '¡Pago exitoso!', description: 'Tu pago con PayPal se procesó correctamente.' });
                        if (mode === 'cart') await clearCart();
                        navigate(`/checkout/success/${cap.orderId}`);
                      } catch (e: any) {
                        console.error('PayPal capture error:', e);
                        toast({ title: 'Error en el pago', description: e.message || 'No se pudo completar el pago con PayPal.', variant: 'destructive' });
                      }
                    }}
                    onError={(err) => {
                      console.error('PayPal Error:', err);
                      toast({ title: 'Error de PayPal', description: 'Ocurrió un error con PayPal. Intenta nuevamente.', variant: 'destructive' });
                    }}
                  />
                </PayPalScriptProvider>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => setStep('select_payment')} className="flex-1">Volver</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'manual_confirmation' && (
            <Card>
              <CardHeader>
                <CardTitle>Confirma tu pago</CardTitle>
                <CardDescription>
                  Ingresa el ID de transacción de {selectedPaymentMethod === 'yape' ? 'Yape' : 'Plin'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <AlertDescription>
                    <strong>Orden:</strong> {currentOrder?.order_number}<br />
                    <strong>Total:</strong> {checkoutService.formatPrice(total.amount, total.currency)}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="transaction_id">ID de Transacción</Label>
                  <Input
                    id="transaction_id"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Ingresa el ID que aparece en tu app"
                    maxLength={20}
                  />
                  <p className="text-sm text-muted-foreground">
                    Encuentra este código en tu aplicación de {selectedPaymentMethod === 'yape' ? 'Yape' : 'Plin'} después de realizar el pago
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('select_payment')}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button 
                  onClick={handleConfirmManualPayment}
                  disabled={!transactionId.trim() || loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar Pago
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
