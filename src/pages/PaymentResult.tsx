import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Home,
  BookOpen,
  Receipt,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PaymentResult {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    total_amount: number;
    currency: string;
    payment_method: string;
    payment_status: string;
    created_at: string;
    order_items: Array<{
      course_id: string;
      course_title: string;
      course_price: number;
    }>;
  };
  error?: string;
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('order');
  const status = searchParams.get('status') || 'success';
  const paymentMethod = searchParams.get('payment_method');

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (!orderId || !user) {
        setPaymentResult({
          success: false,
          error: 'No se encontró información del pedido'
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
          }
        });

        const data = await response.json();

        if (data.success) {
          setPaymentResult({
            success: true,
            order: data.order
          });

          if (data.order.payment_status === 'completed') {
            toast({
              title: "¡Pago exitoso!",
              description: "Tu compra se procesó correctamente. Ya puedes acceder a tus cursos.",
            });
          }
        } else {
          setPaymentResult({
            success: false,
            error: data.message || 'Error al verificar el estado del pago'
          });
        }
      } catch (error) {
        console.error('Error fetching payment status:', error);
        setPaymentResult({
          success: false,
          error: 'Error de conexión al verificar el pago'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [orderId, user, toast]);

  const getPaymentMethodDisplay = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'mercadopago':
        return 'MercadoPago';
      case 'paypal':
        return 'PayPal';
      case 'googlepay':
        return 'Google Pay';
      default:
        return method || 'Método de pago';
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="w-16 h-16 text-muted-foreground animate-spin" />;
    }

    if (!paymentResult?.success || paymentResult?.order?.payment_status === 'failed') {
      return <AlertCircle className="w-16 h-16 text-destructive" />;
    }

    if (paymentResult?.order?.payment_status === 'pending') {
      return <Clock className="w-16 h-16 text-yellow-500" />;
    }

    return <CheckCircle className="w-16 h-16 text-green-500" />;
  };

  const getStatusMessage = () => {
    if (loading) {
      return {
        title: "Verificando pago...",
        description: "Estamos verificando el estado de tu pago. Esto puede tomar unos momentos."
      };
    }

    if (!paymentResult?.success) {
      return {
        title: "Error en el pago",
        description: paymentResult?.error || "Ocurrió un error al procesar tu pago. Intenta nuevamente."
      };
    }

    const status = paymentResult.order?.payment_status;

    switch (status) {
      case 'completed':
        return {
          title: "¡Pago exitoso!",
          description: "Tu pago se procesó correctamente. Ya tienes acceso a tus cursos."
        };
      case 'pending':
        return {
          title: "Pago pendiente",
          description: "Tu pago está siendo procesado. Te notificaremos cuando se complete."
        };
      case 'failed':
        return {
          title: "Pago fallido",
          description: "No se pudo procesar tu pago. Intenta con otro método de pago."
        };
      default:
        return {
          title: "Estado desconocido",
          description: "No pudimos determinar el estado de tu pago. Contacta con soporte."
        };
    }
  };

  const message = getStatusMessage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {getStatusIcon()}
              <div>
                <h2 className="text-xl font-semibold">{message.title}</h2>
                <p className="text-muted-foreground mt-2">{message.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-2xl">{message.title}</CardTitle>
            <p className="text-muted-foreground">{message.description}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {paymentResult?.success && paymentResult.order && (
              <>
                {/* Order Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Número de Pedido:</span>
                    <span className="font-mono text-sm">{paymentResult.order.order_number}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Método de Pago:</span>
                    <span className="text-sm">{getPaymentMethodDisplay(paymentResult.order.payment_method)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge variant={
                      paymentResult.order.payment_status === 'completed' ? 'default' :
                      paymentResult.order.payment_status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {paymentResult.order.payment_status === 'completed' ? 'Completado' :
                       paymentResult.order.payment_status === 'pending' ? 'Pendiente' :
                       paymentResult.order.payment_status === 'failed' ? 'Fallido' :
                       paymentResult.order.payment_status}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fecha:</span>
                    <span className="text-sm">
                      {new Date(paymentResult.order.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Courses Purchased */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Cursos adquiridos:</h3>
                  <div className="space-y-2">
                    {paymentResult.order.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-sm">{item.course_title}</h4>
                        </div>
                        <span className="font-semibold">
                          ${item.course_price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">
                      ${paymentResult.order.total_amount.toFixed(2)} {paymentResult.order.currency}
                    </span>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {paymentResult?.success && paymentResult.order?.payment_status === 'completed' && (
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full"
                  size="lg"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ir a Mis Cursos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {paymentResult?.success && paymentResult.order?.payment_status === 'pending' && (
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-800">
                    Tu pago está siendo procesado. Te enviaremos un correo cuando se complete.
                  </p>
                </div>
              )}

              {(!paymentResult?.success || paymentResult.order?.payment_status === 'failed') && (
                <Button 
                  onClick={() => navigate('/courses')} 
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Intentar Nuevamente
                </Button>
              )}

              <div className="flex space-x-3">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Inicio
                </Button>
                
                {paymentResult?.success && (
                  <Button 
                    onClick={() => navigate('/dashboard?tab=payments')} 
                    variant="outline"
                    className="flex-1"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Ver Facturas
                  </Button>
                )}
              </div>
            </div>

            {/* Support Message */}
            <div className="text-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              ¿Tienes problemas con tu pago? {' '}
              <Link to="/contact" className="text-primary hover:underline">
                Contacta con nuestro soporte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
