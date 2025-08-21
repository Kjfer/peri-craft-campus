import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ConfirmEmail() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🔧 Confirming email for:', email);
      
      const { data, error } = await supabase.functions.invoke('confirm-email-dev', {
        body: { email }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Email confirmado",
        description: `El email ${email} ha sido confirmado exitosamente en modo desarrollo.`,
      });
      
      setEmail('');
    } catch (error) {
      console.error('❌ Error confirming email:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido al confirmar email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-2xl text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Confirmar Email</h1>
          <p className="text-muted-foreground mt-2">Herramienta de desarrollo</p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle>Confirmación Manual de Email</CardTitle>
            <CardDescription>
              Usa esta herramienta para confirmar emails en modo desarrollo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirmEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email a confirmar</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Mail className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Email
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link 
            to="/auth" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a Autenticación
          </Link>
        </div>
      </div>
    </div>
  );
}