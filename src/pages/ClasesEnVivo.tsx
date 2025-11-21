import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Play, Calendar as CalendarIcon, RefreshCw, AlertCircle, MessageCircle } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import googleSheetsService, { type CursoEnVivo } from "@/services/googleSheetsService";
import { Button } from "@/components/ui/button";

export default function ClasesEnVivo() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [cursos, setCursos] = useState<CursoEnVivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cargar datos de cursos
  const loadCursos = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      
      const cursosData = await googleSheetsService.getCursosEnVivo();
      setCursos(cursosData);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error cargando cursos:', err);
      setError('No se pudieron cargar los cursos en tiempo real');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadCursos();
  }, []);

  // Refrescar datos manualmente
  const handleRefresh = () => {
    googleSheetsService.clearCache();
    loadCursos();
  };
  
  // Filtrar clases por fecha seleccionada
  const clasesDelDia = selectedDate 
    ? cursos.filter(clase => isSameDay(clase.date, selectedDate))
    : [];

  // Obtener fechas que tienen clases
  const fechasConClases = cursos.map(clase => clase.date);

  const getStatusBadge = (date: Date) => {
    const today = new Date();
    const courseDate = new Date(date);
    
    // Normalizar fechas para comparar solo día, mes y año
    today.setHours(0, 0, 0, 0);
    courseDate.setHours(0, 0, 0, 0);
    
    if (courseDate <= today) {
      // Si la fecha del curso ya pasó o es hoy, está "iniciado"
      return <Badge variant="success">En vivo</Badge>;
    } else {
      // Si la fecha del curso es futura, está "programado"
      return <Badge variant="outline" className="border-primary text-primary">Próximamente</Badge>;
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
            Cursos en Vivo
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Consulta el calendario de inicio de nuestros cursos especializados de moda y diseño. 
            Selecciona una fecha para ver qué cursos comienzan ese día y únete a nuestra comunidad de aprendizaje.
          </p>
          
          {/* Estado y controles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Actualizar cursos'}
            </Button>
            
            {lastUpdated && (
              <span className="text-sm text-muted-foreground">
                Última actualización: {format(lastUpdated, "HH:mm", { locale: es })}
              </span>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg max-w-md mx-auto">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Certificación Banner */}
          <Card className="mt-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 max-w-2xl mx-auto">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge className="bg-primary text-primary-foreground">
                  Certificación Incluida
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Todos nuestros cursos en vivo incluyen certificado. Contáctanos para más información sobre los cursos en vivo.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Calendario */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Calendario de Cursos</CardTitle>
                <CardDescription>
                  Selecciona una fecha para ver los cursos programados
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
                <h4 className="font-semibold mb-3 text-center">Leyenda</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-sm text-muted-foreground">Fechas de inicio de cursos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-xs">En vivo</Badge>
                    <span className="text-sm text-muted-foreground">Curso actualmente iniciado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary text-primary text-xs">Próximamente</Badge>
                    <span className="text-sm text-muted-foreground">Próximo a iniciar</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de clases */}
          <div className="lg:col-span-2">
            {loading ? (
              <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-semibold mb-2">Cargando cursos...</h3>
                  <p className="text-muted-foreground">
                    Obteniendo la información más actualizada desde Google Sheets
                  </p>
                </CardContent>
              </Card>
            ) : selectedDate ? (
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  Cursos que inician el {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
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
                                {getStatusBadge(clase.date)}
                              </div>
                              
                              <p className="text-muted-foreground mb-3">{clase.description}</p>
                              
                              <Button 
                                className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                                asChild
                              >
                                <a 
                                  href={`https://wa.me/51920545678?text=${encodeURIComponent(`Hola, quiero información sobre el curso "${clase.title}"`)}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Consultar info
                                </a>
                              </Button>
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
                        <h3 className="text-xl font-semibold mb-2">No hay cursos iniciando</h3>
                        <p className="text-muted-foreground">
                          No hay cursos programados para iniciar en esta fecha. 
                          Selecciona otra fecha en el calendario para ver otros inicios.
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
                  <a href="https://whatsapp.com/channel/0029VbBND0PGpLHSErI7mC1i" target="_blank" rel="noopener" className="inline-block">
                    <button className="bg-success text-success-foreground font-semibold px-6 py-3 rounded-lg shadow hover:bg-success/90 transition-all w-full sm:w-auto">
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