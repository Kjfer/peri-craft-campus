import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { checkoutService } from '@/lib/checkoutService';
import { 
  Check, 
  Star, 
  Crown, 
  Zap, 
  Users, 
  BookOpen, 
  Award, 
  Infinity,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'expired' | 'cancelled';
  plans: SubscriptionPlan;
}

export default function Subscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscriptions();
    if (isAuthenticated) {
      loadUserSubscriptions();
    }
  }, [isAuthenticated]);

  const loadSubscriptions = async () => {
    try {
      const result = await checkoutService.getAvailableSubscriptions();
      if (result.success) {
        setPlans(result.subscriptions);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los planes de suscripción',
        variant: 'destructive'
      });
    }
  };

  const loadUserSubscriptions = async () => {
    try {
      // Implementar endpoint para obtener suscripciones del usuario
      // Por ahora dejamos vacío
      setUserSubscriptions([]);
    } catch (error) {
      console.error('Error loading user subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    setProcessingPlan(plan.id);
    
    try {
      // Navegar al checkout con el plan seleccionado
      navigate('/checkout/subscription', { 
        state: { 
          plan: plan,
          mode: 'subscription'
        }
      });
    } catch (error) {
      console.error('Error starting subscription checkout:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el proceso de suscripción',
        variant: 'destructive'
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro')) {
      return <Crown className="w-6 h-6 text-yellow-500" />;
    }
    if (planName.toLowerCase().includes('basic') || planName.toLowerCase().includes('starter')) {
      return <BookOpen className="w-6 h-6 text-blue-500" />;
    }
    if (planName.toLowerCase().includes('enterprise') || planName.toLowerCase().includes('unlimited')) {
      return <Infinity className="w-6 h-6 text-purple-500" />;
    }
    return <Star className="w-6 h-6 text-green-500" />;
  };

  const isUserSubscribed = (planId: string) => {
    return userSubscriptions.some(sub => 
      sub.plan_id === planId && 
      sub.status === 'active' && 
      new Date(sub.end_date) > new Date()
    );
  };

  const getMostPopularPlan = () => {
    // Lógica para determinar el plan más popular (por precio medio o características)
    if (plans.length === 0) return null;
    
    // Por simplicidad, tomamos el plan del medio si hay 3 o más planes
    if (plans.length >= 3) {
      const sortedByPrice = [...plans].sort((a, b) => a.price - b.price);
      return sortedByPrice[Math.floor(sortedByPrice.length / 2)];
    }
    
    return null;
  };

  const popularPlan = getMostPopularPlan();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Planes de Suscripción
        </h1>
        <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
          Accede a todos nuestros cursos con una suscripción mensual o anual. 
          Aprende sin límites y acelera tu carrera profesional.
        </p>
        
        {/* Beneficios generales */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Acceso completo a cursos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-green-500" />
            <span>Certificados incluidos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-purple-500" />
            <span>Comunidad exclusiva</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span>Contenido actualizado</span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      {plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-lg ${
                popularPlan?.id === plan.id ? 'border-primary shadow-md scale-105' : ''
              } ${
                isUserSubscribed(plan.id) ? 'border-green-500 bg-green-50' : ''
              }`}
            >
              {/* Popular Badge */}
              {popularPlan?.id === plan.id && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium inline-flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    Más Popular
                  </span>
                </div>
              )}

              {/* Subscribed Badge */}
              {isUserSubscribed(plan.id) && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium inline-flex items-center">
                    <Check className="w-3 h-3 mr-1" />
                    Suscrito
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(plan.name)}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="text-4xl font-bold">
                    ${plan.price}
                    <span className="text-lg font-normal text-muted-foreground">
                      /{plan.duration_months === 1 ? 'mes' : `${plan.duration_months} meses`}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {plan.duration_months === 1 ? 'Renovación mensual' : `Facturado cada ${plan.duration_months} meses`}
                  </div>
                </div>

                <Separator />

                {/* Features */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Incluye:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={processingPlan === plan.id || isUserSubscribed(plan.id)}
                  className="w-full"
                  variant={popularPlan?.id === plan.id ? "default" : "outline"}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : isUserSubscribed(plan.id) ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Ya tienes este plan
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Suscribirse Ahora
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No hay planes disponibles</h3>
          <p className="text-muted-foreground">
            Los planes de suscripción estarán disponibles próximamente.
          </p>
        </div>
      )}

      {/* FAQ Section */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Preguntas Frecuentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Puedo cancelar en cualquier momento?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sí, puedes cancelar tu suscripción en cualquier momento desde tu perfil. 
                Mantienes acceso hasta el final del período pagado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Qué métodos de pago aceptan?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Aceptamos PayPal, Google Pay, y Yape QR. Todos los pagos son procesados de forma segura.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Incluye certificados?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sí, todos nuestros planes incluyen certificados digitales verificables 
                al completar los cursos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Hay descuentos para estudiantes?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ofrecemos descuentos especiales para estudiantes. Contacta con soporte 
                para más información sobre precios académicos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}