import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, TestTube } from 'lucide-react';

export default function WebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadWebhookSettings();
  }, []);

  const loadWebhookSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'webhook_validation_url')
        .single();

      if (error) {
        console.error('Error loading webhook settings:', error);
        return;
      }

      if (data) {
        setWebhookUrl(data.setting_value);
      }
    } catch (error) {
      console.error('Error loading webhook settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWebhookSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: webhookUrl })
        .eq('setting_key', 'webhook_validation_url');

      if (error) {
        throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "La URL del webhook se ha actualizado correctamente.",
      });
    } catch (error) {
      console.error('Error saving webhook settings:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración del webhook.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      const testPayload = {
        user_id: "test-user-id",
        user_name: "Usuario de Prueba",
        user_email: "test@example.com",
        receipt_url: "https://example.com/test-receipt.jpg",
        operation_code: "TEST123456",
        order_id: "test-order-id",
        amount: 100.00,
        currency: "PEN",
        courses: [
          { course_id: "test-course-1", course_name: "Curso de Prueba 1" }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast({
          title: "Webhook funcionando",
          description: "El webhook respondió correctamente.",
        });
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Error en el webhook",
        description: "No se pudo conectar con el webhook o devolvió un error.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Webhook</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configura la URL del webhook de n8n para la validación de pagos con Yape QR.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL del Webhook de n8n</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://tu-n8n-url/webhook/validar-pago"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={saveWebhookSettings} 
              disabled={saving || !webhookUrl}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
            
            <Button 
              variant="outline" 
              onClick={testWebhook} 
              disabled={testing || !webhookUrl}
            >
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <TestTube className="w-4 h-4 mr-2" />
              Probar Webhook
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Formato del payload enviado:</h4>
            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "user_id": "uuid del usuario",
  "user_name": "nombre completo",
  "user_email": "correo del usuario",
  "receipt_url": "url del comprobante",
  "operation_code": "código de operación",
  "order_id": "uuid de la orden",
  "amount": 250.00,
  "currency": "PEN",
  "courses": [
    {
      "course_id": "c001",
      "course_name": "Nombre del curso"
    }
  ]
}`}
            </pre>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Respuesta esperada del webhook:</h4>
            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "status": "success" | "error",
  "message": "texto explicativo",
  "redirect_url": "/payment-success" | "/payment-error"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}