import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Settings as SettingsIcon, Mail, Shield, Webhook, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WebhookSettings from './WebhookSettings';
import { supabase } from "@/integrations/supabase/client";

interface PlatformSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  support_email: string;
  maintenance_mode: boolean;
  allow_registrations: boolean;
  require_email_verification: boolean;
  max_course_duration_hours: number;
  default_currency: string;
  payment_methods: {
    paypal: boolean;
    mercadopago: boolean;
    stripe: boolean;
  };
}

function Settings() {
  const [settings, setSettings] = useState<PlatformSettings>({
    site_name: "Peri Institute",
    site_description: "Plataforma de educación en línea especializada en diseño y confección",
    contact_email: "contacto@periinstitute.com",
    support_email: "soporte@periinstitute.com",
    maintenance_mode: false,
    allow_registrations: true,
    require_email_verification: true,
    max_course_duration_hours: 40,
    default_currency: "USD",
    payment_methods: {
      paypal: true,
      mercadopago: true,
      stripe: false
    }
  });
  
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState("");
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTutorialVideoUrl();
  }, []);

  const fetchTutorialVideoUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'tutorial_video_url')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        setTutorialVideoUrl(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching video URL:', error);
    } finally {
      setLoadingVideo(false);
    }
  };

  const saveTutorialVideoUrl = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'tutorial_video_url',
          setting_value: tutorialVideoUrl,
          description: 'URL del video tutorial de YouTube para la página de inicio'
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: "Video guardado",
        description: "El enlace del video tutorial se ha actualizado correctamente"
      });
    } catch (error) {
      console.error('Error saving video URL:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el enlace del video",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (section: string) => {
    try {
      setSaving(true);
      
      // Aquí se implementaría la llamada a la API para guardar configuraciones
      // Por ahora simularemos el guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configuración guardada",
        description: `La configuración de ${section} se ha actualizado correctamente`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updatePaymentMethod = (method: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      payment_methods: {
        ...prev.payment_methods,
        [method]: enabled
      }
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Administra la configuración general de la plataforma
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="tutorial">
              <Video className="h-4 w-4 mr-2" />
              Tutorial
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Seguridad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>
                  Configura la información básica de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="site_name">Nombre del Sitio</Label>
                  <Input
                    id="site_name"
                    value={settings.site_name}
                    onChange={(e) => updateSetting('site_name', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="site_description">Descripción del Sitio</Label>
                  <Textarea
                    id="site_description"
                    value={settings.site_description}
                    onChange={(e) => updateSetting('site_description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="max_duration">Duración máxima de cursos (horas)</Label>
                  <Input
                    id="max_duration"
                    type="number"
                    value={settings.max_course_duration_hours}
                    onChange={(e) => updateSetting('max_course_duration_hours', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Moneda predeterminada</Label>
                  <Input
                    id="currency"
                    value={settings.default_currency}
                    onChange={(e) => updateSetting('default_currency', e.target.value)}
                  />
                </div>

                <Button onClick={() => handleSave('general')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutorial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Video Tutorial</CardTitle>
                <CardDescription>
                  Configura el video de YouTube que se mostrará en la página de inicio explicando cómo comprar y acceder a los cursos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tutorial_video_url">URL del Video de YouTube</Label>
                  <Input
                    id="tutorial_video_url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={tutorialVideoUrl}
                    onChange={(e) => setTutorialVideoUrl(e.target.value)}
                    disabled={loadingVideo}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Ingresa la URL completa del video de YouTube. Puede ser en formato: youtube.com/watch?v=... o youtu.be/...
                  </p>
                </div>

                {tutorialVideoUrl && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-gray-100">
                      <iframe
                        src={tutorialVideoUrl.includes('youtube.com') || tutorialVideoUrl.includes('youtu.be') 
                          ? `https://www.youtube.com/embed/${tutorialVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1] || ''}`
                          : tutorialVideoUrl
                        }
                        title="Vista previa del video tutorial"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}

                <Button onClick={saveTutorialVideoUrl} disabled={saving || loadingVideo}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Video'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Email</CardTitle>
                <CardDescription>
                  Configura los emails de contacto y soporte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contact_email">Email de Contacto</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => updateSetting('contact_email', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="support_email">Email de Soporte</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => updateSetting('support_email', e.target.value)}
                  />
                </div>

                <Button onClick={() => handleSave('email')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhookSettings />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Seguridad</CardTitle>
                <CardDescription>
                  Configura las opciones de seguridad y acceso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo de Mantenimiento</Label>
                    <p className="text-sm text-muted-foreground">
                      Deshabilita el acceso al sitio para mantenimiento
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Permitir Registros</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que nuevos usuarios se registren
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_registrations}
                    onCheckedChange={(checked) => updateSetting('allow_registrations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verificación de Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Requerir verificación de email para nuevos usuarios
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_email_verification}
                    onCheckedChange={(checked) => updateSetting('require_email_verification', checked)}
                  />
                </div>

                <Button onClick={() => handleSave('security')} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default Settings;