import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { checkoutService } from '@/lib/checkoutService';
import { 
  Check, 
  ArrowLeft, 
  Shield, 
  Clock, 
  CreditCard,
  Smartphone,
  Crown
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[];
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
}

export default function SubscriptionCheckout() {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select_payment' | 'processing' | 'completed' | 'failed'>('select_payment');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Obtener el plan del estado de navegación
    const planFromState = location.state?.plan;
    if (!planFromState) {
      navigate('/subscriptions');
      return;
    }

    setPlan(planFromState);
    loadPaymentMethods();
  }, [user, location.state]);

  const loadPaymentMethods = async () => {
    try {
      const methods = await checkoutService.getAvailablePaymentMethods('subscription');
      setAvailablePaymentMethods(methods.map(method => ({
        id: method.id,
        name: method.name,
        icon: method.icon,
        description: method.description || '',
        available: true
      })));
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los métodos de pago',
        variant: 'destructive'
      });
    }
  };

  const handleStartCheckout = async () => {
    if (!selectedPaymentMethod || !plan) return;

    setLoading(true);
    setStep('processing');

    try {
      let result;

      switch (selectedPaymentMethod) {
        case 'paypal':
          result = await checkoutService.processPayPalSubscriptionPayment(plan.id, plan);
          if (result.success && result.redirectUrl) {
            window.location.href = result.redirectUrl;
            return;
          }
          break;

        case 'googlepay':
          // Para Google Pay necesitaremos implementar el flujo específico
          toast({
            title: 'Google Pay',
            description: 'Próximamente disponible para suscripciones',
            variant: 'default'
          });
          setStep('select_payment');
          setLoading(false);
          return;

        case 'yape_qr':
          // Para Yape QR, redirigir al flujo de QR
          result = await checkoutService.startSubscriptionCheckout(plan.id, plan, 'yape_qr');
          if (result.success) {
            setStep('completed');
          }
          break;

        default:
          throw new Error('Método de pago no soportado');
      }

      if (result?.success) {
        setStep('completed');
        toast({
          title: 'Éxito',
          description: 'Suscripción iniciada correctamente',
          variant: 'default'
        });
      } else {
        throw new Error(result?.message || 'Error procesando el pago');
      }

    } catch (error: any) {
      console.error('Error in subscription checkout:', error);
      setStep('failed');
      toast({
        title: 'Error',
        description: error.message || 'Error procesando la suscripción',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'paypal': return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'googlepay': return <Smartphone className="w-5 h-5 text-gray-600" />;
      case 'yape_qr': return <Smartphone className="w-5 h-5 text-purple-600" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/subscriptions')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a planes
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Checkout de Suscripción</h1>
          <p className="text-muted-foreground">Completa tu suscripción al plan {plan.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plan Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Resumen de Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-muted-foreground text-sm">{plan.description}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Incluye:</h4>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Plan {plan.name}</span>
                <span className="font-medium">${plan.price}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Duración</span>
                <span>{plan.duration_months === 1 ? '1 mes' : `${plan.duration_months} meses`}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Renovación</span>
                <span>{plan.duration_months === 1 ? 'Mensual' : `Cada ${plan.duration_months} meses`}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>${plan.price}</span>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-blue-900">Garantía de 30 días</p>
                  <p className="text-blue-700">Si no estás satisfecho, te devolvemos tu dinero.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'select_payment' && (
              <>
                <div className="space-y-3">
                  {availablePaymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getMethodIcon(method.id)}
                          <div>
                            <h4 className="font-medium">{method.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
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

                <Button
                  onClick={handleStartCheckout}
                  disabled={!selectedPaymentMethod || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Suscribirse por ${plan.price}
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Al continuar, aceptas nuestros términos de servicio y política de privacidad
                  </p>
                </div>
              </>
            )}

            {step === 'processing' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Procesando suscripción...</h3>
                <p className="text-muted-foreground">Por favor espera mientras procesamos tu pago</p>
              </div>
            )}

            {step === 'completed' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">¡Suscripción activada!</h3>
                <p className="text-muted-foreground mb-4">
                  Tu suscripción al plan {plan.name} está ahora activa
                </p>
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Ir a mis cursos
                </Button>
              </div>
            )}

            {step === 'failed' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Error en el pago</h3>
                <p className="text-muted-foreground mb-4">
                  Hubo un problema procesando tu suscripción
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('select_payment')}
                    className="flex-1"
                  >
                    Reintentar
                  </Button>
                  <Button 
                    onClick={() => navigate('/subscriptions')}
                    className="flex-1"
                  >
                    Volver a planes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}