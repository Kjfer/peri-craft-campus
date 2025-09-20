import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Settings,
  Download,
  Eye
} from 'lucide-react';

interface UserSubscription {
  id: string;
  plan_name: string;
  plan_description: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string;
  next_billing_date?: string;
  price: number;
  duration_months: number;
  auto_renew: boolean;
  created_at: string;
  cancelled_at?: string;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  total_spent: number;
  next_billing_amount: number;
}

export default function MySubscriptions() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    loadUserSubscriptions();
    loadSubscriptionStats();
  }, [user]);

  const loadUserSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error loading subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (error: any) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las suscripciones',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const response = await fetch('/api/subscriptions/user/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading subscription stats:', error);
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta suscripción?')) {
      return;
    }

    setCancellingId(subscriptionId);

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error cancelling subscription');
      }

      toast({
        title: 'Suscripción cancelada',
        description: 'La suscripción se canceló correctamente. Tendrás acceso hasta el final del período actual.',
        variant: 'default'
      });

      // Recargar suscripciones
      loadUserSubscriptions();
      loadSubscriptionStats();

    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la suscripción. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Activa
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Cancelada
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expirada
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mis Suscripciones</h1>
        <p className="text-muted-foreground mt-2">
          Administra tus suscripciones activas y revisa tu historial
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Suscripciones</p>
                  <p className="text-2xl font-bold">{stats.total_subscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Activas</p>
                  <p className="text-2xl font-bold">{stats.active_subscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Download className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Invertido</p>
                  <p className="text-2xl font-bold">${stats.total_spent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Próximo Cobro</p>
                  <p className="text-2xl font-bold">${stats.next_billing_amount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tienes suscripciones activas</h3>
            <p className="text-muted-foreground mb-6">
              Explora nuestros planes de suscripción para acceder a contenido premium
            </p>
            <Button onClick={() => navigate('/subscriptions')}>
              Ver Planes de Suscripción
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{subscription.plan_name}</CardTitle>
                    <p className="text-muted-foreground">{subscription.plan_description}</p>
                  </div>
                  {getStatusBadge(subscription.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Precio</p>
                    <p className="text-lg font-semibold">${subscription.price}</p>
                    <p className="text-xs text-muted-foreground">
                      por {subscription.duration_months === 1 ? 'mes' : `${subscription.duration_months} meses`}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Período Actual</p>
                    <p className="text-sm">{formatDate(subscription.current_period_start)}</p>
                    <p className="text-sm text-muted-foreground">
                      hasta {formatDate(subscription.current_period_end)}
                    </p>
                  </div>

                  {subscription.next_billing_date && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Próximo Cobro</p>
                      <p className="text-sm">{formatDate(subscription.next_billing_date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {subscription.auto_renew ? 'Renovación automática' : 'No se renovará'}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Suscrito desde</p>
                    <p className="text-sm">{formatDate(subscription.created_at)}</p>
                    {subscription.cancelled_at && (
                      <p className="text-xs text-red-600">
                        Cancelada: {formatDate(subscription.cancelled_at)}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Facturas
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {subscription.status === 'active' && subscription.auto_renew && (
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    )}
                    
                    {subscription.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelSubscription(subscription.id)}
                        disabled={cancellingId === subscription.id}
                      >
                        {cancellingId === subscription.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Cancelando...
                          </>
                        ) : (
                          'Cancelar'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center">
        <Button onClick={() => navigate('/subscriptions')} size="lg">
          Explorar Más Planes
        </Button>
      </div>
    </div>
  );
}