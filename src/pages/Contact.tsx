import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  MessageCircle,
  HeadphonesIcon
} from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Configurable webhook URL (can be set via admin settings)
  const WEBHOOK_URL = "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If webhook is configured, send the data
      if (WEBHOOK_URL) {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "no-cors",
          body: JSON.stringify(formData),
        });
      } else {
        // Simulación si no hay webhook
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      toast({
        title: "Mensaje enviado",
        description: "Gracias por contactarnos. Te responderemos pronto.",
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        type: ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Datos de contacto principales
  const whatsappNumber = "+51 920 545 678"; // Cambia por el real
  const whatsappLink = "https://wa.me/51920545678"; // Cambia por el real
  const whatsappHours = "Lun a Vie: 9:00 a.m. - 6:00 p.m.";
  const supportEmail = "soporte@instituto.pericompanygroup.com";
  const supportHours = "Lun a Vie: 9:00 a.m.- 10 p.m.";

  // Ejemplo de personal comercial
  const commercialStaff = {
    name: "Pether Peri",
    role: "Asesor Comercial",
    photo: "https://idjmabhvzupcdygguqzm.supabase.co/storage/v1/object/sign/images/Captura%20de%20pantalla%202025-09-29%20100039.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MGYzZmU5YS1lMWI0LTQ1YzktOTJiYy1jZjU1OTljYWQ0YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZXMvQ2FwdHVyYSBkZSBwYW50YWxsYSAyMDI1LTA5LTI5IDEwMDAzOS5wbmciLCJpYXQiOjE3NTkxNTgwOTMsImV4cCI6MTc5MDY5NDA5M30.xqMPwRVWF5vVgB5HXE6vWtd_hM_fYTIwCtDKBgYQUoY",
    description: "Te ayudará a resolver tus dudas y a encontrar el curso en vivo ideal para ti."
  };

  const faqItems = [
    {
      question: "¿Cómo puedo inscribirme a un curso?",
      answer: "Puedes inscribirte directamente desde la página del curso cuando hayas iniciado sesión. Si es gratuito, el acceso es inmediato. Para cursos pagos, serás dirigido al proceso de pago seguro."
    },
    {
      question: "¿Los certificados son reconocidos oficialmente?",
      answer: "Nuestros certificados son reconocidos por la industria y incluyen un código único de verificación que puede ser validado en nuestra plataforma."
    },
    {
      question: "¿Puedo acceder a los cursos desde cualquier dispositivo?",
      answer: "Sí, nuestra plataforma es completamente responsive y funciona en computadoras, tablets y móviles."
    },
    {
      question: "¿Ofrecen soporte técnico?",
      answer: "Sí, nuestro equipo de soporte está disponible para ayudarte con cualquier problema técnico que puedas tener."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Tienes dudas o quieres más información?
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Contáctanos por WhatsApp o llena el formulario. Nuestro equipo comercial te ayudará a encontrar la mejor opción para ti.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button className="bg-green-500 text-white text-lg px-8 py-6" asChild>
                <a href="https://whatsapp.com/channel/0029VbBND0PGpLHSErI7mC1i" target="_blank" rel="noopener">
                  <MessageCircle className="mr-2" /> Unirse a la comunidad WhatsApp
                </a>
              </Button>
            </div>
            <div className="text-muted-foreground text-base mb-2">
              ¿Te gustaría recibir información constante sobre nuestros cursos y eventos en vivo? Únete a nuestro canal de difusión exclusiva de WhatsApp y mantente al día.
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground text-xl font-semibold mb-8">
            ¿Quieres más información sobre algún curso vivo en específico? Escribenos para cualquier duda o consulta.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
            {/* WhatsApp Card con personal */}
            <Card className="text-center border-0 bg-gradient-to-br from-background to-muted/50 hover:shadow-elegant transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center mb-2">
                  <img src={commercialStaff.photo} alt={commercialStaff.name} className="w-16 h-16 rounded-full object-cover border-2 border-green-400 mb-2" />
                  <div className="font-semibold text-lg">{commercialStaff.name}</div>
                  <div className="text-xs text-green-700 mb-1">{commercialStaff.role}</div>
                </div>
                <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">WhatsApp</h3>
                <p className="text-sm text-muted-foreground mb-1">Atención inmediata</p>
                <div className="font-medium text-lg mb-1">{whatsappNumber}</div>
                <div className="text-xs text-muted-foreground mb-3">{whatsappHours}</div>
                <p className="text-xs text-muted-foreground mb-3">{commercialStaff.description}</p>
                <Button className="bg-green-500 text-white w-full" asChild>
                  <a href={whatsappLink} target="_blank" rel="noopener">
                    Chatear ahora
                  </a>
                </Button>
              </CardContent>
            </Card>
            {/* Email Card */}
            <Card className="text-center border-0 bg-gradient-to-br from-background to-muted/50 hover:shadow-elegant transition-all duration-300">
              <CardContent className="pt-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Correo</h3>
                <p className="text-sm text-muted-foreground mb-1">Soporte por correo</p>
                <div className="font-medium text-lg mb-1">{supportEmail}</div>
                <div className="text-xs text-muted-foreground mb-3">{supportHours}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form and FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* ¿No encuentras lo que buscas? */}
            <div className="mb-6 lg:col-span-2">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 text-lg">¿No encuentras lo que buscas?</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Si no encuentras respuesta en las preguntas frecuentes, puedes enviarnos tu consulta usando el formulario y te responderemos lo antes posible.
                  </p>
                </CardContent>
              </Card>
            </div>
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Envíanos un mensaje</CardTitle>
                <CardDescription>
                  Completa el formulario y te responderemos lo antes posible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        required
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        required
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de consulta</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => handleInputChange("type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de consulta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Consulta general</SelectItem>
                        <SelectItem value="technical">Soporte técnico</SelectItem>
                        <SelectItem value="courses">Información sobre cursos</SelectItem>
                        <SelectItem value="payment">Problemas de pago</SelectItem>
                        <SelectItem value="certificates">Certificados</SelectItem>
                        <SelectItem value="partnership">Alianzas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>



                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange("message", e.target.value)}
                      required
                      placeholder="Describe tu consulta o problema..."
                      rows={6}
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"></div>
                        Enviando...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar mensaje
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* FAQ */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Preguntas Frecuentes</h2>
                <p className="text-muted-foreground mb-6">
                  Encuentra respuestas rápidas a las consultas más comunes
                </p>
              </div>

              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{item.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>


            </div>
          </div>
        </div>
      </section>
    </div>
  );
}