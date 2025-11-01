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
import { Loader2, CreditCard, Smartphone, DollarSign, CheckCircle, AlertTriangle, Bug } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { checkoutService, CheckoutItem } from '@/lib/checkoutService';

import { savePayPalState, loadPayPalState, clearPayPalState, checkPayPalOrderStatus, generatePayPalDirectUrl, isPayPalEnvironmentSandbox } from '@/lib/paypalStateManager';
import { supabase } from '@/integrations/supabase/client';
import { ExchangeRateDisplay } from '@/components/payment/ExchangeRateDisplay';
import { SimplePayPal } from './SimplePayPal';
import yapeQRImage from '@/assets/yape-qr-placeholder.jpeg';

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
  const [step, setStep] = useState<'select_payment' | 'processing' | 'manual_confirmation' | 'completed' | 'paypal' | 'yape_qr'>('select_payment');
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [paypalDbOrderId, setPaypalDbOrderId] = useState<string | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);


  // PayPal configuration
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "AbZNoNeWaqleDpPT-rXspcyQNKaBTd4_axIpRhIHPqM_Kl-97REvIfkU2BXJIWsImgE5FwBhc2vcFEgG",
    currency: "USD",
    intent: "capture" as const
  };

  // Debug: Log PayPal configuration (solo en consola)
  useEffect(() => {
    if (selectedPaymentMethod === 'paypal') {
      console.log('🔧 PayPal Configuration loaded');
      
      // Verificar que el Client ID no esté vacío
      if (!paypalOptions.clientId || paypalOptions.clientId.length < 10) {
        console.error('❌ PayPal Client ID appears invalid');
        setError('Error de configuración de PayPal. Por favor contacta al soporte.');
      }
    }
  }, [selectedPaymentMethod]);

  // Detector de foco de ventana para PayPal
  useEffect(() => {
    if (step !== 'paypal') return;

    const handleFocus = () => {
      if (paypalOrderId && !loading) {
        console.log('🔍 Ventana recuperó el foco - verificando estado de PayPal...');
        // Dar un pequeño delay para que PayPal termine sus procesos
        setTimeout(() => {
          if (paypalOrderId) {
            console.log('💡 Sugerencia: Si completaste el pago, usa el botón "Verificar Estado del Pago"');
            toast({
              title: "¿Completaste el pago?",
              description: "Si ya pagaste en PayPal, usa el botón 'Verificar Estado del Pago'",
              variant: "default"
            });
          }
        }, 2000);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [step, paypalOrderId, loading]);

  // Persistir y recuperar estado de Yape QR y PayPal
  useEffect(() => {
    // Verificar si es una recuperación real (recarga de página o navegación de retorno)
    const isPageReload = !window.performance || performance.navigation.type === 1;
    const hasNavigatedBack = sessionStorage.getItem('checkout_in_progress') === 'true';
    
    // Solo recuperar estado si es recarga o navegación de retorno Y estamos en select_payment
    if (step !== 'select_payment') return;
    if (!isPageReload && !hasNavigatedBack) {
      // Marcar que estamos en checkout
      sessionStorage.setItem('checkout_in_progress', 'true');
      return;
    }
    
    // Recuperar estado guardado
    const savedState = loadPayPalState();
    
    if (savedState && (savedState.step === 'yape_qr' || savedState.step === 'paypal')) {
      const stateAge = Date.now() - (savedState.timestamp || 0);
      
      // Solo recuperar si tiene menos de 15 minutos
      if (stateAge > 15 * 60 * 1000) {
        console.log('🗑️ Estado expirado (>15min), limpiando...');
        clearPayPalState();
        sessionStorage.removeItem('checkout_in_progress');
        return;
      }
      
      setStep(savedState.step);
      setCurrentOrder(savedState.currentOrder);
      setTransactionId(savedState.transactionId || '');
      setSelectedPaymentMethod(savedState.selectedPaymentMethod || '');
      
      if (savedState.paypalDbOrderId) {
        setPaypalDbOrderId(savedState.paypalDbOrderId);
      }
      
      if (savedState.paypalOrderId) {
        setPaypalOrderId(savedState.paypalOrderId);
      }
      
      console.log(`✅ Estado de ${savedState.step} recuperado (hace ${Math.round(stateAge/1000/60)} minutos)`);
      
      // Solo mostrar toast si realmente fue una recarga
      if (isPageReload) {
        toast({
          title: "Sesión Recuperada",
          description: `Continuando con tu pago de ${savedState.step === 'paypal' ? 'PayPal' : 'Yape QR'}`,
          variant: "default"
        });
      }
      
      // Si es PayPal y hay order ID, mostrar opción de continuar
      if (savedState.step === 'paypal' && savedState.paypalOrderId && isPageReload) {
        setTimeout(() => {
          toast({
            title: "Pago de PayPal en progreso",
            description: "¿Ya completaste el pago? Usa el botón 'Verificar Estado del Pago'",
            variant: "default"
          });
        }, 3000);
      }
      
      // Recuperar archivo si existe (solo para Yape QR)
      if (savedState.step === 'yape_qr') {
        const savedFileData = sessionStorage.getItem('yape_receipt_file');
        if (savedFileData) {
          try {
            const fileInfo = JSON.parse(savedFileData);
            console.log('📁 Archivo previamente guardado:', fileInfo.name);
            setError(`Archivo: ${fileInfo.name} - Vuelve a seleccionarlo para continuar`);
          } catch (e) {
            console.error('Error recuperando info de archivo:', e);
          }
        }
      }
    }
  }, []); // Solo ejecutar una vez al montar

  // Guardar estado cuando cambie el paso a yape_qr o paypal
  useEffect(() => {
    if ((step === 'yape_qr' || step === 'paypal') && currentOrder) {
      savePayPalState({
        step,
        currentOrder,
        transactionId,
        selectedPaymentMethod,
        paypalDbOrderId: step === 'paypal' ? paypalDbOrderId : null,
        paypalOrderId: step === 'paypal' ? paypalOrderId : null,
      });
      
      // Guardar info del archivo (solo para Yape QR)
      if (step === 'yape_qr' && receiptFile) {
        const fileInfo = {
          name: receiptFile.name,
          size: receiptFile.size,
          type: receiptFile.type,
          timestamp: Date.now()
        };
        sessionStorage.setItem('yape_receipt_file', JSON.stringify(fileInfo));
        console.log('📁 Info de archivo guardada:', fileInfo);
      }
    }
    
    // Limpiar cuando se complete
    if (step === 'completed') {
      clearPayPalState();
      sessionStorage.removeItem('checkout_in_progress');
    }
    
    // Marcar que hay checkout en progreso
    if (step === 'yape_qr' || step === 'paypal') {
      sessionStorage.setItem('checkout_in_progress', 'true');
    }
  }, [step, currentOrder, transactionId, selectedPaymentMethod, receiptFile, paypalDbOrderId, paypalOrderId]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const initializeCheckout = async () => {
      await loadExchangeRate(); // Cargar tasa de cambio al inicio de forma síncrona
      loadPaymentMethods();
    };
    
    initializeCheckout();
  }, [user]);

  const loadPaymentMethods = async () => {
    try {
      const methods = await checkoutService.getAvailablePaymentMethods();
      setAvailablePaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const loadExchangeRate = async () => {
    try {
      console.log('🔄 Loading current exchange rate...');
      await checkoutService.getExchangeRateInfo();
      console.log('✅ Exchange rate loaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to load exchange rate:', error);
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
    
    if (selectedPaymentMethod === 'yape_qr') {
      return {
        amount: checkoutService.convertToPENSync(usdTotal), // Usar versión síncrona para UI
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

  // For Yape QR, create order first and then show QR code
  if (selectedPaymentMethod === 'yape_qr') {
    console.log('🔍 Creating order for Yape QR payment...');
    try {
      const result = await checkoutService.startCheckoutFromCart(items, 'yape_qr');
      
      if (result.success && result.order) {
        setCurrentOrder(result.order);
        setStep('yape_qr');
        console.log('✅ Order created for Yape QR:', result.order);
      } else {
        throw new Error('Error creating order for Yape QR');
      }
      return;
    } catch (error) {
      console.error('Error creating Yape QR order:', error);
      throw error;
    }
  }

      const result = await checkoutService.startCheckoutFromCart(items, backendMethod);
      
      if (result.success && result.paymentUrl) {
        // Redirect to payment URL for MercadoPago methods (external redirect required)
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

  const handleConfirmYapePayment = async () => {
    if (!transactionId.trim()) {
      setError('Por favor ingresa el código de operación');
      return;
    }

    if (!receiptFile) {
      setError('Por favor sube el comprobante de pago');
      return;
    }

    if (!currentOrder?.id) {
      setError('Error: No se encontró la orden. Por favor intenta de nuevo.');
      return;
    }

    setLoading(true);
    setError('');


    try {
      console.log('🔍 Starting Yape payment confirmation process...');
      console.log('File details:', {
        name: receiptFile.name,
        type: receiptFile.type,
        size: receiptFile.size
      });

      // SOLO usar checkoutService.confirmManualPayment - sin función wrapper
      const result = await checkoutService.confirmManualPayment(
        currentOrder.id,
        transactionId,
        receiptFile
      );
      
      if (result.success) {
        // Limpiar estado de Yape QR inmediatamente para evitar confusiones en futuros pagos
        clearPayPalState();
        sessionStorage.removeItem('checkout_in_progress');
        sessionStorage.removeItem('yape_receipt_file');
        console.log('🧹 Estado de Yape QR limpiado después de confirmar pago');
        
        toast({
          title: "Comprobante enviado",
          description: result.message || "Estamos procesando tu pago.",
        });
        
        // Clear cart first before redirecting
        if (mode === 'cart') {
          await clearCart();
        }
        
        // Redirect to CheckoutPending instead of completed
        // The order status listener will handle the redirect to success page
        navigate(`/checkout/pending?orderId=${currentOrder.id}`);
      } else {
        throw new Error(result.message || "Error al procesar el pago");
      }

    } catch (error: any) {
      console.error('❌ Yape payment confirmation failed:', error);
      
      let errorMessage = 'Error al confirmar el pago';
      
      if (error.message?.includes('formato') || error.message?.includes('file')) {
        errorMessage = error.message;
      } else if (error.message?.includes('autenticado')) {
        errorMessage = 'Por favor inicia sesión nuevamente';
      } else if (error.message?.includes('upload')) {
        errorMessage = 'Error al subir el archivo. Verifica tu conexión e inténtalo nuevamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const handleConfirmManualPayment = async () => {
    if (!transactionId.trim()) {
      setError('Por favor ingresa el ID de transacción');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!currentOrder?.id) {
        throw new Error('No se encontró la orden. Por favor intenta de nuevo.');
      }
      
      const result = await checkoutService.confirmManualPayment(
        currentOrder.id,
        transactionId,
        receiptFile!
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
      case 'googlepay':
        return <Smartphone className="w-5 h-5" />;
      case 'paypal':
        return <CreditCard className="w-5 h-5" />;
      case 'yape_qr':
        return <Smartphone className="w-5 h-5" />;
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
                          selectedPaymentMethod === 'yape_qr'
                            ? checkoutService.convertToPENSync(item.course?.price || 0)
                            : item.course?.price || 0,
                          selectedPaymentMethod === 'yape_qr' ? 'PEN' : 'USD'
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
                      className={`border rounded-lg p-4 transition-colors ${
                        method.id === 'googlepay' 
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                          : selectedPaymentMethod === method.id
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (method.id !== 'googlepay') {
                          setSelectedPaymentMethod(method.id);
                        }
                      }}
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
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Advertencia importante para el usuario */}
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">Instrucciones Importantes</span>
                  </div>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                    <li><strong>No cierres</strong> la ventana emergente de PayPal hasta completar el pago</li>
                    <li><strong>No cambies de pestaña</strong> durante el proceso de pago</li>
                    <li>Si la ventana se cierra accidentalmente, usa los botones de recuperación que aparecerán</li>
                    <li>El proceso de pago es seguro y está protegido por PayPal</li>
                  </ul>
                </div>
                
                {/* Opción de recuperación si se perdió la ventana */}
                {paypalOrderId && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-semibold text-orange-800">¿Se cerró la ventana de PayPal?</span>
                    </div>
                    <p className="text-sm text-orange-700 mb-3">
                      Si se cerró accidentalmente la ventana de pago, puedes continuar usando una de estas opciones:
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const isSandbox = isPayPalEnvironmentSandbox(paypalOptions.clientId);
                          const paypalUrl = generatePayPalDirectUrl(paypalOrderId, isSandbox);
                          window.open(paypalUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes');
                        }}
                        className="w-full"
                      >
                        🔗 Continuar Pago en Nueva Ventana
                      </Button>
                    </div>
                  </div>
                )}
                
                <SimplePayPal 
                  clientId={paypalOptions.clientId}
                  onCreateOrder={async () => {
                    setError(''); // Limpiar errores previos
                    
                    // Si ya tenemos un PayPal Order ID, reutilizarlo
                    if (paypalOrderId) {
                      console.log('♻️ Reutilizando orden PayPal existente:', paypalOrderId);
                      return paypalOrderId;
                    }
                    
                    console.log('🔄 Creando nueva orden de PayPal...');
                    
                    const { data, error } = await supabase.functions.invoke('paypal', {
                      body: {
                        action: 'create',
                        cartItems: items.map(i => ({
                          id: i.course_id || i.subscription_id,
                          course_id: i.course_id || null,
                          subscription_id: i.subscription_id || null,
                          title: i.course?.title,
                          price: i.course?.price,
                          instructor_name: i.course?.instructor_name,
                          thumbnail_url: i.course?.thumbnail_url,
                          type: i.subscription_id ? 'subscription' : 'course'
                        })),
                        totalAmount: items.reduce((sum, i) => sum + (i.course?.price || 0), 0)
                      }
                    });
                    
                    if (error || !data?.paypalOrderId) {
                      const errorMsg = error?.message || 'No se pudo crear la orden de PayPal';
                      console.error('❌ Error creando orden:', errorMsg);
                      setError(errorMsg);
                      throw new Error(errorMsg);
                    }
                    
                    console.log('✅ Orden PayPal creada:', data.paypalOrderId);
                    setPaypalDbOrderId(data.dbOrderId);
                    setPaypalOrderId(data.paypalOrderId);
                    
                    return data.paypalOrderId as string;
                  }}
                  onApprove={async (data) => {
                    setError(''); // Limpiar errores previos
                    console.log('🔄 Capturando pago de PayPal...');
                    
                    const { data: cap, error } = await supabase.functions.invoke('paypal', {
                      body: {
                        action: 'capture',
                        orderID: data.orderID,
                        dbOrderId: paypalDbOrderId
                      }
                    });
                    
                    if (error || !cap?.success) {
                      const errorMsg = error?.message || cap?.error || 'No se pudo completar el pago con PayPal';
                      console.error('❌ Error capturando pago:', errorMsg);
                      setError(errorMsg);
                      throw new Error(errorMsg);
                    }
                    
                    console.log('✅ Pago PayPal completado:', cap.orderId);
                    toast({ 
                      title: '¡Pago exitoso!', 
                      description: 'Tu pago con PayPal se procesó correctamente.' 
                    });
                    
                    // Limpiar estado guardado
                    clearPayPalState();
                    
                    if (mode === 'cart') await clearCart();
                    navigate(`/checkout/success/${cap.orderId}`);
                  }}
                  onError={(err) => {
                    console.error('PayPal Error:', err);
                    const errorMsg = 'Ocurrió un error con PayPal. Verifica tu configuración e intenta nuevamente.';
                    setError(errorMsg);
                    toast({ 
                      title: 'Error de PayPal', 
                      description: errorMsg, 
                      variant: 'destructive' 
                    });
                  }}
                  onCancel={() => {
                    console.log('PayPal payment cancelled by user');
                    toast({ 
                      title: 'Pago cancelado', 
                      description: 'El pago con PayPal fue cancelado. Puedes intentar nuevamente.', 
                      variant: 'default' 
                    });
                    // No limpiar el estado aquí para permitir reintentos
                  }}
                />
                
                {/* Botón de verificación manual */}
                {paypalOrderId && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold mb-2 text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      ¿Ya completaste el pago?
                    </h4>
                    <p className="text-sm text-green-700 mb-3">
                      Si ya realizaste el pago en PayPal, haz clic aquí para verificar y finalizar tu compra:
                    </p>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const result = await checkPayPalOrderStatus(supabase, paypalOrderId, paypalDbOrderId!);
                          
                          if (result.completed && result.orderId) {
                            toast({ 
                              title: '¡Pago confirmado!', 
                              description: 'Tu pago se procesó correctamente.' 
                            });
                            clearPayPalState();
                            if (mode === 'cart') await clearCart();
                            navigate(`/checkout/success/${result.orderId}`);
                          } else {
                            toast({
                              title: 'Pago pendiente',
                              description: 'El pago aún no se ha completado. Asegúrate de finalizar el proceso en PayPal.',
                              variant: 'default'
                            });
                          }
                        } catch (error: any) {
                          toast({
                            title: 'Error de verificación',
                            description: 'No se pudo verificar el estado del pago. Intenta nuevamente.',
                            variant: 'destructive'
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      ✅ Verificar y Finalizar Compra
                    </Button>
                  </div>
                )}
                
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => setStep('select_payment')} className="flex-1">
                    ← Cambiar Método de Pago
                  </Button>
                  {paypalOrderId && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        // Limpiar todo el estado de PayPal
                        setPaypalDbOrderId(null);
                        setPaypalOrderId(null);
                        clearPayPalState();
                        setStep('select_payment');
                        toast({
                          title: "Proceso reiniciado",
                          description: "Puedes seleccionar un método de pago nuevamente",
                          variant: "default"
                        });
                      }}
                      className="flex-1"
                    >
                      🔄 Empezar de Nuevo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'yape_qr' && (
            <Card>
              <CardHeader>
                <CardTitle>Pago con Yape QR</CardTitle>
                <CardDescription>
                  Escanea el código QR y sube tu comprobante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* QR Code Display */}
                <div className="text-center">
                  <div className="inline-block p-4 bg-white rounded-lg border-2">
                    <img 
                      src={yapeQRImage} 
                      alt="Código QR Yape" 
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Escanea este código con tu app de Yape
                  </p>
                </div>

                {/* Exchange Rate Info */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium mb-2 text-amber-800">Información de Tasa de Cambio:</h4>
                  <ExchangeRateDisplay showDetails={false} className="mb-2" />
                  <p className="text-xs text-amber-700">
                    Los precios se convierten automáticamente usando la tasa de cambio actual.
                  </p>
                </div>

                 {/* Instructions */}
                 <div className="bg-blue-50 p-4 rounded-lg">
                   <h4 className="font-medium mb-2">Instrucciones para pagar:</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      <li>Escanea el QR con tu aplicación de Yape</li>
                      <li>Ingresa el monto exacto: <strong>{checkoutService.formatPrice(total.amount, total.currency)}</strong></li>
                      <li>Realiza el pago y copia el código de operación</li>
                      <li>Toma una foto del comprobante y súbela aquí</li>
                      <li>Escribe el código de operación en el formulario</li>
                    </ol>
                    <p className="text-xs text-blue-700 mt-2 font-medium">
                      ⚠️ Importante: El archivo del comprobante NO se guarda al cambiar de pestaña. Asegúrate de tener el archivo listo antes de enviar el formulario.
                    </p>
                 </div>

                {/* Upload Form */}
                <div className="space-y-4">
                   <div>
                     <Label htmlFor="receipt">Comprobante de pago (JPG, PNG o PDF - Max 5MB)</Label>
                     <Input
                       id="receipt"
                       type="file"
                       accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (5MB limit)
                            if (file.size > 5 * 1024 * 1024) {
                              setError('El archivo es muy grande. Máximo 5MB permitido.');
                              return;
                            }
                            
                            // Validate file type
                            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
                            if (!validTypes.includes(file.type)) {
                              setError('Tipo de archivo no válido. Solo JPG, PNG o PDF.');
                              return;
                            }
                            
                            setReceiptFile(file);
                            setError(''); // Clear any previous errors
                            console.log('✅ Archivo seleccionado:', file.name);
                            
                            // Guardar info del archivo
                            const fileInfo = {
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              timestamp: Date.now()
                            };
                            sessionStorage.setItem('yape_receipt_file', JSON.stringify(fileInfo));
                          }
                        }}
                       className="mt-1"
                     />
                     {receiptFile && (
                       <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                         <p className="text-green-800">
                           ✅ Archivo seleccionado: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                         </p>
                       </div>
                     )}
                   </div>

                   <div>
                    <Label htmlFor="transaction-id">Código de operación de Yape</Label>
                    <Input
                      id="transaction-id"
                      type="text"
                      placeholder="Ej: 123456789"
                      value={transactionId}
                      onChange={(e) => {
                        setTransactionId(e.target.value);
                        // Actualizar sessionStorage con el nuevo valor
                        if (step === 'yape_qr' && currentOrder) {
                          const stateToSave = {
                            step,
                            currentOrder,
                            transactionId: e.target.value,
                            paymentMethod: selectedPaymentMethod,
                            timestamp: Date.now()
                          };
                          sessionStorage.setItem('yape_checkout_state', JSON.stringify(stateToSave));
                        }
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep('select_payment')}
                      className="flex-1"
                    >
                      Volver
                    </Button>
                    <Button 
                      onClick={handleConfirmYapePayment}
                      disabled={!receiptFile || !transactionId.trim() || loading}
                      className="flex-1"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Confirmar pago
                    </Button>
                  </div>
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
