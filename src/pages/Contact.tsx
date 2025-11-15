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

  // Webhook URL para n8n (configurar con tu instancia real)
  const N8N_WEBHOOK_URL = process.env.REACT_APP_N8N_WEBHOOK_URL || "https://peri-n8n-1-n8n.j60naj.easypanel.host/webhook/contact-form";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Debug: Verificar datos del formulario antes de enviar
    console.log("Datos del formulario:", formData);
    
    // Validación adicional
    if (!formData.type) {
      toast({
        title: "⚠️ Tipo de consulta requerido",
        description: "Por favor selecciona el tipo de consulta antes de enviar.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    // Preparar datos para n8n con metadatos adicionales
    const submissionData = {
      ...formData,
      timestamp: new Date().toISOString(),
      source: "website_contact_form",
      userAgent: navigator.userAgent,
      language: navigator.language || "es",
      // Datos adicionales para clasificación IA
      metadata: {
        urgency: formData.type === "technical" ? "high" : "medium",
        category: formData.type || "general",
        requiresResponse: true,
        autoRespond: true
      }
    };

    // Debug: Verificar datos que se enviarán
    console.log("Datos a enviar al webhook:", submissionData);

    try {
      // Enviar a n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(submissionData),
      });

      console.log("Respuesta del webhook:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("Resultado:", result);
        toast({
          title: "✅ Mensaje enviado correctamente",
          description: "Gracias por contactarnos. Nuestro sistema procesará tu consulta y te responderemos por email.",
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Limpiar formulario tras envío exitoso
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        type: ""
      });
      
    } catch (error) {
      console.error("Error enviando a n8n:", error);
      toast({
        title: "⚠️ Error de conectividad",
        description: "No pudimos procesar tu mensaje automáticamente. Por favor, contáctanos directamente por WhatsApp o email.",
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
                  <MessageCircle className="mr-2" /> Unirse al canal de WhatsApp
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
            <Card className="text-center border-0 bg-gradient-to-br from-white via-green-50/50 to-green-100/30 hover:shadow-elegant hover:shadow-green-200/50 transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center mb-4">
                  <img src={commercialStaff.photo} alt={commercialStaff.name} className="w-20 h-20 rounded-full object-cover border-4 border-green-400 shadow-lg mb-3" />
                  <div className="font-bold text-xl text-gray-900">{commercialStaff.name}</div>
                  <div className="text-sm text-green-700 font-semibold mb-1">{commercialStaff.role}</div>
                </div>
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center text-white mb-4 shadow-lg">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">WhatsApp</h3>
                <p className="text-sm text-gray-600 font-semibold mb-2">Atención inmediata</p>
                <div className="font-bold text-xl mb-2 text-green-700">{whatsappNumber}</div>
                <div className="text-sm text-gray-600 font-medium mb-4">{whatsappHours}</div>
                <p className="text-sm text-gray-700 font-medium mb-4 bg-white/80 p-3 rounded-lg">{commercialStaff.description}</p>
                <Button className="bg-green-500 hover:bg-green-600 text-white w-full font-semibold py-3 shadow-lg" asChild>
                  <a href={whatsappLink} target="_blank" rel="noopener">
                    Chatear ahora
                  </a>
                </Button>
              </CardContent>
            </Card>
            {/* Email Card */}
            <Card className="text-center border-0 bg-gradient-to-br from-white via-blue-50/50 to-blue-100/30 hover:shadow-elegant hover:shadow-blue-200/50 transition-all duration-300 transform hover:-translate-y-1">
              <CardContent className="pt-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary flex items-center justify-center text-white mb-6 shadow-lg">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-gray-900">Correo</h3>
                <p className="text-sm text-gray-600 font-semibold mb-3">Soporte por correo</p>
                <div className="font-bold text-lg mb-3 text-primary bg-white/80 p-3 rounded-lg">{supportEmail}</div>
                <div className="text-sm text-gray-600 font-medium">{supportHours}</div>
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
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-yellow-50/50 border-primary/30 shadow-lg">
                <CardContent className="pt-6">
                  <h3 className="font-bold mb-3 text-xl text-gray-900">¿No encuentras lo que buscas?</h3>
                  <p className="text-gray-700 font-medium mb-2 leading-relaxed">
                    Si no encuentras respuesta en las preguntas frecuentes, puedes enviarnos tu consulta usando el formulario y te responderemos lo antes posible.
                  </p>
                </CardContent>
              </Card>
            </div>
            {/* Contact Form */}
            <Card className="border-0 shadow-elegant bg-gradient-to-br from-white to-gray-50/50 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
                <CardTitle className="text-2xl font-bold text-gray-900">Envíanos un mensaje</CardTitle>
                <CardDescription className="text-gray-700 font-medium">
                  Completa el formulario y te responderemos lo antes posible
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
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
                      onValueChange={(value) => {
                        console.log("Seleccionado:", value); // Debug
                        handleInputChange("type", value);
                      }}
                      required
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Selecciona el tipo de consulta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta general">Consulta general</SelectItem>
                        <SelectItem value="Soporte técnico">Soporte técnico</SelectItem>
                        <SelectItem value="Información sobre cursos">Información sobre cursos</SelectItem>
                        <SelectItem value="Problemas de pago">Problemas de pago</SelectItem>
                        <SelectItem value="Certificados">Certificados</SelectItem>
                        <SelectItem value="Alianzas">Alianzas</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Debug: Mostrar valor actual */}
                    <div className="text-xs text-muted-foreground">
                      Valor seleccionado: {formData.type || "ninguno"}
                    </div>
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
                  <Card key={index} className="border-0 bg-gradient-to-r from-white to-gray-50/70 hover:shadow-lg hover:from-primary/5 hover:to-primary/10 transition-all duration-300 transform hover:-translate-y-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-bold text-gray-900">{item.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 font-medium leading-relaxed">{item.answer}</p>
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