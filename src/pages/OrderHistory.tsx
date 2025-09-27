import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkoutService, CheckoutOrder } from '@/lib/checkoutService';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadOrders();
  }, [user, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await checkoutService.getUserOrders(
        1, 
        50, 
        statusFilter === 'all' ? undefined : statusFilter
      );
      
      if (response.success) {
        setOrders(response.orders || []);
      } else {  
        throw new Error('Error loading orders');
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      setError('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!user) {
    console.log('🚫 OrderHistory: User not authenticated');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Historial de Órdenes</h1>
              <p className="text-muted-foreground">
                Revisa todas tus compras y pagos
              </p>
            </div>
            
            <div className="w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando órdenes...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadOrders}>Reintentar</Button>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tienes órdenes</h3>
              <p className="text-muted-foreground mb-6">
                Cuando compres un curso, aparecerá aquí
              </p>
              <Button onClick={() => navigate('/cursos')}>
                Explorar cursos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        Orden #{order.order_number}
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(order.payment_status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.payment_status)}
                          {getStatusLabel(order.payment_status)}
                        </div>
                      </Badge>
                      <div className="text-right">
                        <p className="font-bold">
                          {checkoutService.formatPrice(order.total_amount, order.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {order.payment_method}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium">Cursos:</h4>
                    {order.order_items.map((item, index) => (
                      <div key={item.id}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-8 bg-gray-200 rounded flex-shrink-0">
                              {item.courses?.thumbnail_url ? (
                                <img 
                                  src={item.courses.thumbnail_url} 
                                  alt={item.courses.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">
                                  📚
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{item.courses?.title || 'Curso'}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.courses?.instructor_name}
                              </p>
                            </div>
                          </div>
                          <p className="font-medium">
                            {checkoutService.formatPrice(item.price, order.currency)}
                          </p>
                        </div>
                        {index < order.order_items.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {order.payment_status === 'paid' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/dashboard')}
                      >
                        Ver mis cursos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
