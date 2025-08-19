import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

export default function EmailConfirmation() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3003/api/auth/confirm-email-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: data.message });
        toast({
          title: "¡Email confirmado!",
          description: "Tu email ha sido confirmado exitosamente. Ya puedes iniciar sesión.",
        });
      } else {
        setResult({ success: false, message: data.error });
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = 'Error de conexión. Verifica que el servidor esté funcionando.';
      setResult({ success: false, message: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Confirmar Email</CardTitle>
          <CardDescription>
            Herramienta de desarrollo para confirmar emails manualmente
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleConfirmEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email a confirmar</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Email
            </Button>
          </form>

          {result && (
            <Alert className={`mt-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => window.location.href = '/auth'}>
              Ir a Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
