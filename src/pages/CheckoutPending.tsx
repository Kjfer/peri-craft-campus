import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ArrowLeft } from 'lucide-react';
import { useOrderStatusListener } from '@/hooks/useOrderStatusListener';

// Utilidad para extraer orderId de location
function getOrderIdFromLocation(location: any): string | null {
  if (location?.state?.orderId) return location.state.orderId;
  const params = new URLSearchParams(location.search);
  return params.get('orderId');
}

export default function CheckoutPending() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const orderId = getOrderIdFromLocation(location);

  // El estado exitoso es 'completed', no 'paid'
  useOrderStatusListener(orderId || '', (msg) => setErrorMsg(msg), 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Pending Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-3xl font-bold text-yellow-600 mb-2">{errorMsg ? 'Pago Rechazado' : 'Pago Pendiente'}</h1>
          <p className="text-lg text-muted-foreground">
            {errorMsg
              ? errorMsg
              : 'Tu pago está siendo procesado. Te notificaremos cuando esté confirmado.'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿Qué sigue ahora?</CardTitle>
            <CardDescription>
              Tu orden está creada y en proceso de validación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Verificación en proceso</h4>
                <p className="text-xs text-muted-foreground">
                  {errorMsg
                    ? 'Tu pago no pudo ser validado. Si crees que es un error, contacta a soporte.'
                    : 'Estamos validando tu pago. Esto puede tomar algunos minutos.'}
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Te notificaremos</h4>
                <p className="text-xs text-muted-foreground">
                  Recibirás un email cuando el pago sea confirmado y tengas acceso a tus cursos.
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Verifica tu historial</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Puedes revisar el estado de tu orden en tu historial de compras
                </p>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/ordenes')}
                  className="w-full"
                >
                  Ver Historial de Órdenes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="min-w-[200px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir al Dashboard
          </Button>

          <Button
            size="lg"
            onClick={() => navigate('/cursos')}
            className="min-w-[200px]"
          >
            Explorar Más Cursos
          </Button>
        </div>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Información importante</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Los pagos pueden tardar hasta 24 horas en confirmarse</li>
                <li>• No necesitas hacer nada más, solo esperar</li>
                <li>• Tu orden está segura y registrada en el sistema</li>
                <li>• Si tienes dudas, contacta a soporte</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}