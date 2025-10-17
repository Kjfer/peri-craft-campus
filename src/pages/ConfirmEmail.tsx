import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ConfirmEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu email...');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Extraer tokens del hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('📧 Procesando confirmación de email...');
        console.log('📧 Type:', type);
        console.log('📧 Has access token:', !!accessToken);

        if (!accessToken || !refreshToken) {
          throw new Error('Token de confirmación no válido');
        }

        // Establecer la sesión con los tokens recibidos
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        console.log('✅ Email confirmado exitosamente');
        
        setStatus('success');
        setMessage('¡Email confirmado exitosamente!');
        
        toast({
          title: "✅ Email confirmado",
          description: "Tu cuenta ha sido activada. Redirigiendo...",
        });

        // Esperar 2 segundos y redirigir a la página de inicio de sesión
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);

      } catch (error) {
        console.error('❌ Error confirmando email:', error);
        
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Error al confirmar el email');
        
        toast({
          title: "Error",
          description: "No se pudo confirmar tu email. Intenta nuevamente.",
          variant: "destructive",
        });

        // Redirigir al login después de 3 segundos incluso con error
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      }
    };

    handleEmailConfirmation();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 py-12 px-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            {status === 'loading' && <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />}
            {status === 'success' && <CheckCircle className="h-8 w-8 text-primary-foreground" />}
            {status === 'error' && <XCircle className="h-8 w-8 text-primary-foreground" />}
          </div>
          <CardTitle>
            {status === 'loading' && 'Confirmando Email'}
            {status === 'success' && '¡Email Confirmado!'}
            {status === 'error' && 'Error de Confirmación'}
          </CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {status === 'success' && 'Serás redirigido al inicio de sesión en unos momentos...'}
          {status === 'error' && 'Serás redirigido al inicio de sesión para intentar nuevamente...'}
        </CardContent>
      </Card>
    </div>
  );
}