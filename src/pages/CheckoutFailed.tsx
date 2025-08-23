import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function CheckoutFailed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Failed Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Pago No Completado</h1>
          <p className="text-lg text-muted-foreground">
            No se pudo procesar tu pago. No te preocupes, no se realizó ningún cargo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿Qué puedes hacer?</CardTitle>
            <CardDescription>
              Te sugerimos las siguientes opciones para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Volver al carrito</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Tus cursos siguen en el carrito, puedes intentar pagar nuevamente
                </p>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Explorar cursos</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Descubre más cursos disponibles en nuestra plataforma
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/cursos')}
                  className="w-full"
                >
                  Ver Cursos
                </Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">¿Necesitas ayuda?</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Contacta a nuestro equipo de soporte
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/contacto')}
                  className="w-full"
                >
                  Contactar Soporte
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Posibles causas</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cancelación del pago en el proveedor</li>
                <li>• Datos de pago incorrectos</li>
                <li>• Problemas técnicos temporales</li>
                <li>• Fondos insuficientes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}