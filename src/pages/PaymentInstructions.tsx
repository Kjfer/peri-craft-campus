import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Smartphone, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentInstructions() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transactionId, setTransactionId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [phoneNumberState, setPhoneNumberState] = useState<string | null>(null);

  const paymentMethod = searchParams.get('method') || 'yape';
  const amount = searchParams.get('amount') || '0';

  const phoneNumber = phoneNumberState || '999-123-456'; // Número de ejemplo si no hay otro
  const concept = `Peri Institute - Orden ${orderId?.slice(-8)}`;
  const qrPayload = `YAPE|phone:${phoneNumber}|amount:${amount}|concept:${encodeURIComponent(concept)}`;
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrPayload)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copiado`,
      description: "Se ha copiado al portapapeles",
    });
  };

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      toast({
        title: "ID de transacción requerido",
        description: "Por favor ingresa el ID de la transacción",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3003/api/payments/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          transactionId
        })
      });

      const data = await response.json();

      if (data.success) {
        setPaymentConfirmed(true);
        toast({
          title: "¡Pago confirmado!",
          description: "Tu pago se ha procesado exitosamente.",
        });
        
        // Redirect to success page after confirmation
        setTimeout(() => {
          navigate(`/payment/success/${orderId}?method=${paymentMethod}&amount=${amount}&confirmed=true`);
        }, 2000);
      } else {
        throw new Error(data.error || 'Error confirmando el pago');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast({
        title: "Error al confirmar pago",
        description: error.message || "No se pudo confirmar el pago. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Load user profile to obtain configured Yape number (if any)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const resp = await fetch('http://localhost:3003/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await resp.json();
        if (data?.success && data.profile) {
          if (data.profile.yape_number) setPhoneNumberState(data.profile.yape_number);
        }
      } catch (err) {
        console.warn('Could not load profile for Yape number', err);
      }
    };

    loadProfile();
  }, []);

  const methodConfig = {
    yape: {
      name: 'Yape',
      color: 'purple',
      icon: <Smartphone className="w-6 h-6" />,
      instructions: [
        'Abre la aplicación Yape en tu celular',
        'Selecciona "Yapear"',
        'Ingresa el número de celular o escanea el QR',
        'Ingresa el monto exacto',
        'Agrega el concepto proporcionado',
        'Confirma el pago',
        'Copia el ID de transacción que aparece'
      ]
    },
    plin: {
      name: 'Plin',
      color: 'blue',
      icon: <Smartphone className="w-6 h-6" />,
      instructions: [
        'Abre la aplicación Plin en tu celular',
        'Selecciona "Enviar dinero"',
        'Ingresa el número de celular',
        'Ingresa el monto exacto',
        'Agrega el concepto proporcionado',
        'Confirma el pago',
        'Copia el ID de transacción que aparece'
      ]
    }
  };

  const config = methodConfig[paymentMethod as keyof typeof methodConfig] || methodConfig.yape;

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">
            ¡Pago Confirmado!
          </h1>
          <p className="text-green-700">
            Redirigiendo a la página de éxito...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 bg-${config.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
            {config.icon}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Pago con {config.name}
          </h1>
          <p className="text-muted-foreground">
            Sigue estas instrucciones para completar tu pago
          </p>
        </div>

        {/* Payment Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Detalles del Pago</span>
              <Badge variant="outline">
                <Clock className="w-4 h-4 mr-1" />
                Pendiente
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Monto a pagar</p>
                <p className="text-2xl font-bold">S/ {amount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Método</p>
                <p className="font-semibold">{config.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Número de orden</p>
                <p className="font-mono text-xs">{orderId}</p>
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Número de celular</p>
                  <p className="font-semibold">{phoneNumber}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(phoneNumber, 'Número')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {paymentMethod === 'yape' && (
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">Escanea este QR en Yape para pagar</p>
                  <div className="flex justify-center mb-2">
                    <img src={qrUrl} alt="QR Yape" className="w-40 h-40 object-contain" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(qrUrl, 'QR')}>Copiar QR</Button>
                    <Button size="sm" onClick={() => copyToClipboard(phoneNumber, 'Número')}>Copiar número</Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Concepto</p>
                  <p className="font-semibold">{concept}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(concept, 'Concepto')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Instrucciones de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {config.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Confirmation Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Confirmar Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Una vez que hayas completado el pago, ingresa el ID de transacción que aparece en tu aplicación para confirmar el pago.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="transactionId">ID de Transacción</Label>
              <Input
                id="transactionId"
                placeholder="Ej: 12345678-ABCD-1234"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>

            <Button
              onClick={handleConfirmPayment}
              disabled={isConfirming || !transactionId.trim()}
              className="w-full"
              size="lg"
            >
              {isConfirming ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando pago...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/cursos')}
            className="flex items-center mx-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al catálogo
          </Button>
        </div>
      </div>
    </div>
  );
}
