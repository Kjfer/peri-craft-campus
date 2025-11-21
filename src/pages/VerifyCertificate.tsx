import { Shield, Award, FileCheck, Clock, MessageCircle, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export default function VerifyCertificate() {
  const whatsappNumber = "+51920545678";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\s/g, "")}`;
  const supportEmail = "info@instituto.pericompanygroup.com";

  const faqItems = [
    {
      question: "¿Qué requisitos necesito para solicitar un certificado?",
      answer: "Para solicitar tu certificado debes haber completado el 100% del curso, incluyendo todas las lecciones y evaluaciones. Además, debes estar al día con el pago del curso."
    },
    {
      question: "¿Cómo puedo solicitar mi certificado?",
      answer: "Una vez completado el curso, te aparecerá una notificación en la plataforma E-learning. Puedes contactarnos por WhatsApp o correo electrónico para iniciar el proceso de certificación. Nuestro equipo te guiará en los pasos necesarios."
    },
    {
      question: "¿Cuánto tiempo tarda en llegar mi certificado?",
      answer: "El proceso de emisión del certificado toma entre 7 a 15 días hábiles desde que completas todos los requisitos y realizas la solicitud formal. Te notificaremos por correo cuando esté listo."
    },
    {
      question: "¿El certificado tiene algún costo adicional?",
      answer: "El certificado tiene un costo adicional que varía según el tipo de curso. Contáctanos para conocer los detalles específicos del certificado que deseas obtener y las opciones de pago disponibles."
    },
    {
      question: "¿Cómo puedo verificar la autenticidad de un certificado?",
      answer: "Cada certificado incluye un código único de verificación. Pronto habilitaremos un sistema de verificación en línea. Mientras tanto, puedes contactarnos con el código del certificado para verificar su autenticidad."
    },
    {
      question: "¿El certificado es digital o físico?",
      answer: "Ofrecemos ambas opciones. El certificado digital se entrega en formato PDF de alta calidad. Si prefieres un certificado físico impreso, tiene un costo adicional por impresión y envío."
    },
    {
      question: "¿Qué información incluye el certificado?",
      answer: "Tu certificado incluye: tu nombre completo, nombre del curso, fecha de finalización, duración del curso en horas, código único de verificación, y la firma del instructor o director académico."
    },
    {
      question: "¿Puedo obtener un certificado si no completé el curso al 100%?",
      answer: "No, el certificado solo se emite a estudiantes que hayan completado el 100% del contenido del curso. Esto asegura que el certificado represente un aprendizaje completo y de calidad."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full mb-6">
            <Shield className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Certificación de Cursos
          </h1>
          <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
            Obtén tu certificado oficial al completar tus cursos. Valida tus conocimientos y destaca en tu carrera profesional.
          </p>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Proceso de Certificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card className="text-center border-2 border-primary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileCheck className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Completa el Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Finaliza todas las lecciones y evaluaciones del curso al 100%
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-primary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Solicita tu Certificado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Contáctanos por WhatsApp o correo para iniciar el proceso
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-primary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Procesamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Esperamos de 7 a 15 días hábiles mientras procesamos tu certificado
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-primary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Recibe tu Certificado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tu certificado digital llegará por correo, o físico por envío
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Preguntas Frecuentes sobre Certificación</h2>
          <p className="text-center text-muted-foreground mb-12">
            Encuentra respuestas a las preguntas más comunes sobre nuestros certificados
          </p>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">¿Listo para solicitar tu certificado?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Si ya completaste tu curso al 100%, contáctanos para iniciar el proceso de certificación. 
                Nuestro equipo te ayudará con todos los pasos necesarios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white" asChild>
                  <a href={whatsappLink} target="_blank" rel="noopener">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Contactar por WhatsApp
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={`mailto:${supportEmail}`}>
                    <Mail className="mr-2 h-5 w-5" />
                    Enviar correo
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
