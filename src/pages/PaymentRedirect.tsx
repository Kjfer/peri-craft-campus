import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function PaymentRedirect() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const method = searchParams.get('method') || 'paypal';
  const paymentId = searchParams.get('paymentId') || '';

  useEffect(() => {
    // Simulate external provider flow and redirect back to success after 2s
    const t = setTimeout(() => {
      navigate(`/payment/success/${orderId}?method=${method}&paymentId=${paymentId}`);
    }, 2000);

    return () => clearTimeout(t);
  }, [orderId, method, paymentId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Proveedor de pago ({method})</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="mb-4">Simulando pasarela externa... Serás redirigido en breve.</p>
          <div className="flex justify-center">
            <Button onClick={() => navigate(`/payment/success/${orderId}?method=${method}&paymentId=${paymentId}`)}>Simular éxito ahora</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
