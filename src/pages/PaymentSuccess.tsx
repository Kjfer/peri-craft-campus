import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, ArrowLeft, Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccess() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const paymentMethod = searchParams.get('method') || 'yape';
  const amount = searchParams.get('amount') || '0';

  useEffect(() => {
    // Simular la carga de detalles de la orden
    const loadOrderDetails = async () => {
      try {
        // En una implementación real, harías una llamada a la API
        // Por ahora simulamos los datos
        setTimeout(() => {
          setOrderDetails({
            orderId: orderId || 'demo-order',
            paymentMethod: paymentMethod,
            amount: parseFloat(amount),
            status: 'completed',
            date: new Date().toLocaleDateString('es-PE'),
            time: new Date().toLocaleTimeString('es-PE'),
            courses: [
              {
                id: '1',
                title: 'Patronaje de Blusas y Faldas',
                instructor: 'Pether Peri',
                price: parseFloat(amount) || 250
              }
            ]
          });
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error loading order details:', error);
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [orderId, paymentMethod, amount]);

  const handleDownloadReceipt = () => {
    toast({
      title: "Descargando recibo",
      description: "El recibo se descargará en formato PDF.",
    });
  };

  const handleShareReceipt = () => {
    toast({
      title: "Compartiendo recibo",
      description: "Se copiará el enlace al portapapeles.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700">Procesando tu pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 mb-2">
            ¡Pago Exitoso!
          </h1>
          <p className="text-green-700">
            Tu pago se procesó correctamente con {paymentMethod === 'yape' ? 'Yape' : paymentMethod === 'plin' ? 'Plin' : paymentMethod}
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detalles de la Orden</span>
              <Badge variant="success" className="bg-green-100 text-green-800">
                Completado
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Número de Orden</p>
                <p className="font-mono text-xs">{orderDetails?.orderId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Método de Pago</p>
                <p className="font-semibold capitalize">{orderDetails?.paymentMethod}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha</p>
                <p>{orderDetails?.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hora</p>
                <p>{orderDetails?.time}</p>
              </div>
            </div>

            <Separator />

            {/* Courses */}
            <div>
              <h3 className="font-semibold mb-3">Cursos Adquiridos</h3>
              {orderDetails?.courses.map((course, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Instructor: {course.instructor}
                    </p>
                  </div>
                  <p className="font-semibold">S/ {course.price}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Pagado</span>
              <span>S/ {orderDetails?.amount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Button
            onClick={handleDownloadReceipt}
            variant="outline"
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Recibo
          </Button>
          <Button
            onClick={handleShareReceipt}
            variant="outline"
            className="flex items-center"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            className="flex items-center"
          >
            Ver Mis Cursos
          </Button>
        </div>

        {/* Navigation */}
        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/cursos')}
            className="flex items-center mx-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continuar Comprando
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>Recibirás un email de confirmación en tu bandeja de entrada.</p>
            <p>Si tienes preguntas, contáctanos en soporte@periinstitute.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
