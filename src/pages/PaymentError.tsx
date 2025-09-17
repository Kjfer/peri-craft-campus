import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, ArrowLeft, Upload } from 'lucide-react';

export default function PaymentError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const messageParam = searchParams.get('message');
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam));
    }
  }, [searchParams]);

  const handleRetryPayment = () => {
    navigate('/checkout/carrito');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleUploadNewReceipt = () => {
    navigate('/checkout/carrito');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">Error en el Pago</CardTitle>
          <p className="text-muted-foreground mt-2">
            {message || 'Hubo un problema al procesar tu pago'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">Instrucciones para continuar:</h3>
            <ul className="text-sm text-primary/80 space-y-1">
              <li>• Verifica que el comprobante sea claro y legible</li>
              <li>• Asegúrate de que el código de operación sea correcto</li>
              <li>• El monto debe coincidir exactamente con tu compra</li>
              <li>• Si persiste el problema, contacta a soporte</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleUploadNewReceipt} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Subir Nuevo Comprobante
            </Button>
            <Button onClick={handleRetryPayment} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar Pago
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>¿Necesitas ayuda? <a href="/contacto" className="text-primary hover:underline">Contáctanos</a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}