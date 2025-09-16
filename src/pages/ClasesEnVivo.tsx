import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Play, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

// Datos de muestra de clases en vivo
const clasesEnVivo = [
  {
    id: 1,
    title: "Taller Patronaje de Vestidos Básicos - Módulo 1",
    date: new Date(2025, 8, 18), // 18 de septiembre 2025
    time: "19:00",
    duration: "2 horas",
    instructor: "Pether Peri",
    students: 25,
    status: "iniciado",
    type: "live",
    description: "Introducción al patronaje básico y toma de medidas"
  },
  {
    id: 2,
    title: "Taller Patronaje de Vestidos de Gala - Sesión Práctica",
    date: new Date(2025, 8, 20), // 20 de septiembre 2025
    time: "18:30",
    duration: "2.5 horas",
    instructor: "Pether Peri",
    students: 18,
    status: "proximo",
    type: "live",
    description: "Desarrollo de moldes para vestidos sirena"
  },
  {
    id: 3,
    title: "Taller Patronaje de Blusas y Faldas - Técnicas Avanzadas",
    date: new Date(2025, 8, 22), // 22 de septiembre 2025
    time: "20:00",
    duration: "1.5 horas",
    instructor: "Pether Peri",
    students: 32,
    status: "proximo",
    type: "live",
    description: "Variaciones de blusas asimétricas y off shoulder"
  },
  {
    id: 4,
    title: "Sesión de Preguntas y Respuestas - Patronaje General",
    date: new Date(2025, 8, 25), // 25 de septiembre 2025
    time: "19:30",
    duration: "1 hora",
    instructor: "Pether Peri",
    students: 45,
    status: "proximo",
    type: "qa",
    description: "Resuelve todas tus dudas sobre patronaje en vivo"
  },
  {
    id: 5,
    title: "Masterclass: Técnicas de Alta Costura",
    date: new Date(2025, 8, 28), // 28 de septiembre 2025
    time: "18:00",
    duration: "3 horas",
    instructor: "Pether Peri",
    students: 15,
    status: "proximo",
    type: "masterclass",
    description: "Aprende técnicas exclusivas de la alta costura francesa"
  }
];

export default function ClasesEnVivo() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Filtrar clases por fecha seleccionada
  const clasesDelDia = selectedDate 
    ? clasesEnVivo.filter(clase => isSameDay(clase.date, selectedDate))
    : [];

  // Obtener fechas que tienen clases
  const fechasConClases = clasesEnVivo.map(clase => clase.date);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "iniciado":
        return <Badge variant="default" className="bg-green-500 text-white">En vivo</Badge>;
      case "proximo":
        return <Badge variant="outline" className="border-primary text-primary">Próximamente</Badge>;
      default:
        return <Badge variant="secondary">Programado</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "live":
        return <Play className="h-4 w-4" />;
      case "qa":
        return <Users className="h-4 w-4" />;
      case "masterclass":
        return <CalendarIcon className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-4">
            Clases en Vivo
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Únete a nuestras sesiones interactivas en tiempo real con Pether Peri. 
            Selecciona una fecha en el calendario para ver las clases programadas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Calendario */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Calendario de Clases</CardTitle>
                <CardDescription>
                  Selecciona una fecha para ver las clases programadas
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  className="rounded-md border shadow-sm pointer-events-auto"
                  modifiers={{
                    hasClass: fechasConClases
                  }}
                  modifiersStyles={{
                    hasClass: {
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      borderRadius: '50%'
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Leyenda */}
            <Card className="mt-4 border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">Días con clases</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500 text-white text-xs">En vivo</Badge>
                    <span className="text-sm text-muted-foreground">Clase en curso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary text-primary text-xs">Próximamente</Badge>
                    <span className="text-sm text-muted-foreground">Clase programada</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de clases */}
          <div className="lg:col-span-2">
            {selectedDate ? (
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  Clases para {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </h2>
                
                {clasesDelDia.length > 0 ? (
                  <div className="space-y-4">
                    {clasesDelDia.map((clase) => (
                      <Card key={clase.id} className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getTypeIcon(clase.type)}
                                <h3 className="text-lg font-semibold">{clase.title}</h3>
                                {getStatusBadge(clase.status)}
                              </div>
                              
                              <p className="text-muted-foreground mb-3">{clase.description}</p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span>{clase.time} - {clase.duration}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-primary" />
                                  <span>{clase.students} estudiantes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4 text-primary" />
                                  <span>Instructor: {clase.instructor}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No hay clases programadas</h3>
                      <p className="text-muted-foreground">
                        No hay clases en vivo programadas para esta fecha. 
                        Selecciona otra fecha o revisa las próximas sesiones.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Selecciona una fecha</h3>
                  <p className="text-muted-foreground">
                    Utiliza el calendario para seleccionar una fecha y ver las clases programadas.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-16">
          <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">¿Cómo unirse a las clases en vivo?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold text-xl">1</span>
                    </div>
                    <h4 className="font-semibold mb-2">Consulta en línea</h4>
                    <p className="text-sm text-muted-foreground">
                      Escríbenos a cualquiera de nuestros canales de atención.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold text-xl">2</span>
                    </div>
                    <h4 className="font-semibold mb-2">Consulta ofertas</h4>
                    <p className="text-sm text-muted-foreground">
                      Recibe las mejores ofertas que tenemos para ti.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold text-xl">3</span>
                    </div>
                    <h4 className="font-semibold mb-2">Únete en vivo</h4>
                    <p className="text-sm text-muted-foreground">
                      Participa activamente en los cursos en vivo con profesionales del sector.
                    </p>
                  </div>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                  <a href="/contacto" className="inline-block">
                    <button className="bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg shadow hover:bg-primary/90 transition-all w-full sm:w-auto">
                      Contactar área comercial
                    </button>
                  </a>
                  <a href="#LINK_COMUNIDAD_WHATSAPP" target="_blank" rel="noopener" className="inline-block">
                    <button className="bg-green-500 text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-green-600 transition-all w-full sm:w-auto">
                      Unirse a la comunidad WhatsApp
                    </button>
                  </a>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  ¿Tienes dudas sobre el proceso? Nuestro equipo comercial te puede guiar y ayudarte a unirte a nuestro próximo curso en vivo.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}