import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Download, BookOpen } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  course_id: string;
  price: number;
  courses: {
    id: string;
    title: string;
    thumbnail_url?: string;
    instructor_name: string;
  };
}

export default function CheckoutSuccess() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (orderId) {
      fetchOrder();
    }
  }, [user, orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          payment_status,
          created_at,
          order_items (
            id,
            course_id,
            price,
            courses:course_id (
              id,
              title,
              thumbnail_url,
              instructor_name
            )
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user!.id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        navigate('/dashboard');
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando detalles de la orden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Orden no encontrada</h1>
            <Button onClick={() => navigate('/dashboard')}>Volver al Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">¡Pago Exitoso!</h1>
          <p className="text-lg text-muted-foreground">
            Tu orden #{order.order_number} ha sido procesada correctamente
          </p>
          <Badge 
            variant={order.payment_status === 'completed' ? 'default' : 'secondary'}
            className="mt-2"
          >
            {order.payment_status === 'completed' ? 'Completado' : 'Procesando'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Orden</CardTitle>
              <CardDescription>
                Orden realizada el {new Date(order.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium">Número de Orden:</span>
                <span className="font-mono">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Pagado:</span>
                <span className="text-lg font-bold">${order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Estado:</span>
                <Badge 
                  variant={order.payment_status === 'completed' ? 'default' : 'secondary'}
                >
                  {order.payment_status === 'completed' ? 'Completado' : 'Procesando'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Course Access */}
          <Card>
            <CardHeader>
              <CardTitle>Acceso a Cursos</CardTitle>
              <CardDescription>
                Ya puedes acceder a tus nuevos cursos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {item.courses.thumbnail_url ? (
                        <img
                          src={item.courses.thumbnail_url}
                          alt={item.courses.title}
                          className="w-12 h-9 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-9 bg-muted rounded flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight">
                        {item.courses.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {item.courses.instructor_name}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/curso/${item.course_id}`)}
                    >
                      Iniciar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/dashboard')}
            className="min-w-[200px]"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Ir a Mis Cursos
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/cursos')}
            className="min-w-[200px]"
          >
            Explorar Más Cursos
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">¿Qué sigue?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Accede a tus cursos desde "Mis Cursos"</li>
                  <li>• Descarga certificados al completar cursos</li>
                  <li>• Rastrea tu progreso en el dashboard</li>
                  <li>• Accede desde cualquier dispositivo</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">¿Necesitas ayuda?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Contacta soporte: soporte@periinstitute.com</li>
                  <li>• Revisa nuestras FAQ</li>
                  <li>• Chat en vivo disponible 24/7</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
