
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Check, Calendar, Users, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  currency: string;
  all_courses_included: boolean;
  plan_courses?: {
    courses: {
      id: string;
      title: string;
      thumbnail_url?: string;
    };
  }[];
}

interface Course {
  id: string;
  title: string;
  thumbnail_url?: string;
}

const Plans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    fetchAllCourses();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          plan_courses(
            courses(id, title, thumbnail_url)
          )
        `)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error al cargar los planes');
    }
  };

  const fetchAllCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, thumbnail_url')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setAllCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price);
  };

  const getDurationText = (months: number) => {
    if (months === 1) return '1 mes';
    if (months < 12) return `${months} meses`;
    if (months === 12) return '1 año';
    return `${Math.floor(months / 12)} años`;
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para suscribirte');
      navigate('/auth');
      return;
    }

    // Las suscripciones ahora se manejan a través de Hotmart
    toast.info('Las suscripciones se gestionan a través de nuestra plataforma externa. Por favor contacta a soporte para más información.');
  };

  const getMostPopularIndex = () => {
    if (plans.length === 0) return -1;
    // El plan más popular es el del medio o el de precio medio
    return Math.floor(plans.length / 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Planes de Suscripción
          </h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Accede a todos nuestros cursos de diseño y patronaje con nuestros planes especiales. 
            Aprende a tu ritmo y conviértete en un experto.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            <span>Acceso inmediato</span>
            <Check className="h-4 w-4 text-green-500" />
            <span>Soporte incluido</span>
            <Check className="h-4 w-4 text-green-500" />
            <span>Certificados</span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = index === getMostPopularIndex();
            const coursesToShow = plan.all_courses_included ? allCourses : 
              plan.plan_courses?.map(pc => pc.courses) || [];

            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  isPopular ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Más Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="flex items-center justify-center mb-4">
                    {plan.all_courses_included && (
                      <Crown className="h-8 w-8 text-yellow-500 mr-2" />
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-3xl md:text-4xl font-bold text-primary">
                      {formatPrice(plan.price, plan.currency)}
                    </div>
                    <div className="text-muted-foreground">
                      por {getDurationText(plan.duration_months)}
                    </div>
                  </div>

                  <CardDescription className="text-center">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Acceso por {getDurationText(plan.duration_months)}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {plan.all_courses_included 
                          ? `Acceso a todos los ${allCourses.length} cursos`
                          : `${coursesToShow.length} cursos incluidos`
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Certificados al completar</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Soporte por email</span>
                    </div>
                  </div>

                  {/* Courses Preview */}
                  {coursesToShow.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Cursos incluidos:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {coursesToShow.slice(0, 4).map((course, idx) => (
                          <div key={course.id} className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                            <span className="truncate">{course.title}</span>
                          </div>
                        ))}
                        {coursesToShow.length > 4 && (
                          <div className="text-xs text-muted-foreground ml-5">
                            y {coursesToShow.length - 4} cursos más...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subscribe Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={selectedPlan === plan.id}
                    variant={isPopular ? "default" : "outline"}
                  >
                    {selectedPlan === plan.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Procesando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Suscribirme
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {plans.length === 0 && (
          <Card className="text-center py-16 max-w-2xl mx-auto">
            <CardContent>
              <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-4">Planes Próximamente</h3>
              <p className="text-muted-foreground mb-6 text-lg">
                Estamos preparando increíbles planes de suscripción para ti. 
                Mientras tanto, puedes comprar cursos individuales.
              </p>
              <Button onClick={() => navigate('/courses')} size="lg">
                Ver Cursos Disponibles
              </Button>
            </CardContent>
          </Card>
        )}

        {/* FAQ or Additional Info */}
        {plans.length > 0 && (
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold mb-6">¿Por qué elegir un plan de suscripción?</h2>
            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              <div className="space-y-2">
                <Crown className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-semibold">Acceso Completo</h3>
                <p className="text-sm text-muted-foreground">
                  Disfruta de todos nuestros cursos sin limitaciones
                </p>
              </div>
              <div className="space-y-2">
                <Users className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-semibold">Comunidad Exclusiva</h3>
                <p className="text-sm text-muted-foreground">
                  Únete a nuestra comunidad de diseñadores profesionales
                </p>
              </div>
              <div className="space-y-2">
                <Star className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-semibold">Contenido Premium</h3>
                <p className="text-sm text-muted-foreground">
                  Accede a contenido exclusivo y actualizaciones constantes
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Plans;
