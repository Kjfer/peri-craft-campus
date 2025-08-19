import React, { useState, useEffect } from 'react';
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
  const [step, setStep] = useState<'select_payment' | 'processing' | 'manual_confirmation' | 'completed'>('select_payment');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState<string>('');

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
    
    if (selectedPaymentMethod === 'yape' || selectedPaymentMethod === 'plin') {
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

  const result = await checkoutService.startCheckoutFromCart(items, backendMethod);
      
      setCurrentOrder(result.order);

      if (result.next_step === 'manual_confirmation') {
        setStep('manual_confirmation');
      } else {
        // Para otros métodos de pago, procesar la respuesta: si viene paymentUrl redirigimos,
        // si viene success=false mostramos mensaje, si success=true y no hay URL marcamos completado.
        setStep('processing');
        if (result.paymentUrl) {
          // Abrir pasarela en nueva pestaña y esperar confirmación via webhook/confirm endpoint
          window.open(result.paymentUrl, '_blank');
          toast({
            title: 'Redireccionando',
            description: 'Se ha abierto la pasarela de pago en una nueva pestaña. Completa el pago para finalizar la orden.',
            variant: 'default'
          });
          setStep('select_payment');
        } else if (result.next_step && (result.next_step === 'paypal_redirect' || result.next_step === 'google_pay_redirect')) {
          // If backend indicates a redirect-based flow but didn't return paymentUrl, request processing endpoint
          try {
            const processResp = await fetch(`http://localhost:3003/api/payments/process-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ orderId: result.order.id })
            });

            const processData = await processResp.json();
            if (processData && processData.paymentUrl) {
              window.open(processData.paymentUrl, '_blank');
              toast({
                title: 'Redireccionando',
                description: 'Se ha abierto la pasarela de pago en una nueva pestaña. Completa el pago para finalizar la orden.',
                variant: 'default'
              });
            } else {
              toast({ title: 'Pago', description: processData.message || 'No fue posible iniciar la pasarela', variant: 'destructive' });
            }
          } catch (e) {
            console.error('Error calling process-order:', e);
            toast({ title: 'Error', description: 'No se pudo procesar la orden para redirección', variant: 'destructive' });
          }
          setStep('select_payment');
        } else if (result.success === true) {
          setStep('completed');
          if (mode === 'cart') await clearCart();
        } else {
          toast({
            title: 'Pago',
            description: result.message || `${selectedPaymentMethod} será implementado próximamente`,
            variant: 'default'
          });
          setStep('select_payment');
        }
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
      case 'yape':
      case 'plin':
        return <Smartphone className="w-5 h-5" />;
      case 'google_pay':
      case 'paypal':
      case 'card':
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
                        selectedPaymentMethod === 'yape' || selectedPaymentMethod === 'plin' 
                          ? checkoutService.convertToPEN(item.course?.price || 0)
                          : item.course?.price || 0,
                        selectedPaymentMethod === 'yape' || selectedPaymentMethod === 'plin' ? 'PEN' : 'USD'
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
                          {(method.id === 'yape' || method.id === 'plin') && (
                            <p className="text-sm text-muted-foreground">
                              Pago manual con ID de transacción
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
                  {/* Hint: show help if Yape/Plin not available but user profile not Peru */}
                  {!(availablePaymentMethods.some(m => m.id === 'yape' || m.id === 'plin')) && (
                    <div className="mt-3 p-3 border rounded bg-yellow-50">
                      <p className="text-sm">¿Quieres pagar con Yape o Plin? Estos métodos están disponibles solo para usuarios en Perú.</p>
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
