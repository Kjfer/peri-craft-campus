import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  QrCode,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  paymentMethod: 'yape' | 'plin';
  amount: number;
  onPaymentConfirmed?: () => void;
}

export default function PaymentInstructionsModal({
  isOpen,
  onClose,
  orderId,
  paymentMethod,
  amount,
  onPaymentConfirmed
}: PaymentInstructionsModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transactionId, setTransactionId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const phoneNumber = '999-123-456'; // Número de ejemplo para Yape/Plin
  const concept = `Peri Institute - ${orderId?.slice(-8)}`;
  
  // Generar URL del QR para Yape (simulado)
  const qrData = `yape://pay?phone=${phoneNumber}&amount=${amount}&concept=${encodeURIComponent(concept)}`;

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
        toast({
          title: "¡Pago confirmado!",
          description: "Tu pago se ha procesado exitosamente.",
        });
        
        onPaymentConfirmed?.();
        onClose();
        
        // Redirect to success page
        navigate(`/payment/success/${orderId}?method=${paymentMethod}&amount=${amount}&confirmed=true`);
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

  const methodConfig = {
    yape: {
      name: 'Yape',
      color: 'purple',
      icon: <Smartphone className="w-6 h-6" />,
      instructions: [
        'Abre la aplicación Yape en tu celular',
        'Selecciona "Yapear"',
        'Escanea el código QR o ingresa el número',
        'Verifica el monto y concepto',
        'Confirma el pago',
        'Copia el ID de transacción'
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
        'Copia el ID de transacción'
      ]
    }
  };

  const config = methodConfig[paymentMethod];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-10 h-10 bg-${config.color}-100 rounded-full flex items-center justify-center mr-3`}>
                {config.icon}
              </div>
              <span>Pago con {config.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Detalles del Pago</span>
                <Badge variant="outline">
                  <Clock className="w-4 h-4 mr-1" />
                  Pendiente
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto a pagar</p>
                  <p className="text-2xl font-bold">S/ {amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método</p>
                  <p className="font-semibold">{config.name}</p>
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

                {/* QR Code for Yape */}
                {paymentMethod === 'yape' && (
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-3 border">
                      <div className="text-center">
                        <QrCode className="w-24 h-24 mx-auto text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">Código QR para Yape</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          (En implementación real aquí iría el QR)
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Escanea este código QR desde tu app Yape
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {config.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-sm">{instruction}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Confirmation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirmar Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Una vez completado el pago, ingresa el ID de transacción para confirmar.
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

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={isConfirming || !transactionId.trim()}
                  className="flex-1"
                >
                  {isConfirming ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Pago
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
