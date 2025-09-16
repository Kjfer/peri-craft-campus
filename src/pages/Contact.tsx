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
  HeadphonesIcon,
  Whatsapp
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

  // URL del webhook de n8n (configurar aquí cuando esté disponible)
  const N8N_WEBHOOK_URL = "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Si tienes el webhook, colócalo en N8N_WEBHOOK_URL
      if (N8N_WEBHOOK_URL) {
        await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
  const whatsappNumber = "+52 55 1234 5678"; // Cambia por el real
  const whatsappLink = "https://wa.me/525512345678"; // Cambia por el real
  const whatsappHours = "Lun a Vie: 9:00 - 18:00";
  const supportEmail = "soporte@periinstitute.com";
  const supportHours = "Lun a Vie: 9:00 - 18:00";

  const faqItems = [
    {
      question: "¿Cómo puedo inscribirme a un curso?",
      answer: "Puedes inscribirte directamente desde la página del curso. Si es gratuito, el acceso es inmediato. Para cursos pagos, serás dirigido al proceso de pago seguro."
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
                <a href={whatsappLink} target="_blank" rel="noopener">
                  <Whatsapp className="mr-2" /> Hablar por WhatsApp
                </a>
              </Button>
            </div>
            <div className="text-muted-foreground text-base mb-2">
              ¿Te gustaría recibir información personalizada sobre nuestros cursos y experiencias en vivo? ¡Estamos para ayudarte!
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
            {/* WhatsApp Card */}
            <Card className="text-center border-0 bg-gradient-to-br from-background to-muted/50 hover:shadow-elegant transition-all duration-300">
              <CardContent className="pt-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                  <Whatsapp className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">WhatsApp</h3>
                <p className="text-sm text-muted-foreground mb-1">Atención inmediata</p>
                <div className="font-medium text-lg mb-1">{whatsappNumber}</div>
                <div className="text-xs text-muted-foreground mb-3">{whatsappHours}</div>
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
                    <Label htmlFor="subject">Asunto</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                      required
                      placeholder="Asunto de tu mensaje"
                    />
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

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">¿No encuentras lo que buscas?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nuestro equipo de soporte está disponible para ayudarte con cualquier consulta específica.
                  </p>
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Escribir a soporte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}