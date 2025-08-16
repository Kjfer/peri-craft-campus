import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Subscription {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
}

export default function Plans() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/checkout/subscription/${planId}`);
  };

  const getPlanIcon = (index: number) => {
    switch (index) {
      case 0:
        return <CheckCircle className="w-6 h-6" />;
      case 1:
        return <Star className="w-6 h-6" />;
      case 2:
        return <Zap className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  const getPlanColor = (index: number) => {
    switch (index) {
      case 0:
        return "border-primary/50";
      case 1:
        return "border-accent/50 bg-accent/5";
      case 2:
        return "border-secondary/50 bg-secondary/5";
      default:
        return "border-primary/50";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Planes de Suscripción
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Elige el plan que mejor se adapte a tus necesidades y comienza tu viaje en el mundo de la moda
            </p>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                Próximamente tendremos planes de suscripción disponibles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {subscriptions.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative ${getPlanColor(index)} transition-all duration-300 hover:shadow-elegant hover:scale-105`}
                >
                  {index === 1 && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground">
                      Más Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                      {getPlanIcon(index)}
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="text-center pb-8">
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-primary">
                        ${plan.price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        / {plan.duration_months} mes{plan.duration_months !== 1 ? 'es' : ''}
                      </span>
                    </div>

                    <div className="space-y-3 text-left">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={index === 1 ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {user ? 'Seleccionar Plan' : 'Iniciar Sesión'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Preguntas Frecuentes
            </h2>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">¿Puedo cambiar de plan en cualquier momento?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sí, puedes actualizar o cambiar tu plan en cualquier momento desde tu panel de usuario. 
                    Los cambios se aplicarán en tu próximo ciclo de facturación.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">¿Hay algún compromiso a largo plazo?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No, todos nuestros planes son flexibles y puedes cancelar en cualquier momento. 
                    No hay contratos a largo plazo ni penalizaciones por cancelación.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">¿Qué métodos de pago aceptan?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Aceptamos pagos a través de MercadoPago y PayPal, lo que incluye tarjetas de crédito, 
                    débito y otros métodos de pago locales según tu región.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">¿Los certificados están incluidos?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sí, todos los planes incluyen certificados de finalización verificables para cada curso 
                    que completes satisfactoriamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}