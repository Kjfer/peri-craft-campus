import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Users, Award, Star, ArrowRight, BookOpen, Clock, TrendingUp, Calendar as CalendarIcon, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import googleSheetsService, { type CursoEnVivo } from "@/services/googleSheetsService";
import type { Course } from "@/types/course";
import heroImage from "@/assets/hero-banner.jpg";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDirectImageUrl, getDriveImageProps } from "@/lib/imageUtils";

// Component for Video Tutorial
const VideoTutorial = () => {
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMediaUrl = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'tutorial_video_url')
          .maybeSingle();

        if (error) throw error;
        
        if (data?.setting_value) {
          setMediaUrl(data.setting_value);
        }
      } catch (error) {
        console.error('Error fetching media URL:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMediaUrl();
  }, []);


  const getYouTubeEmbedUrl = (url: string) => {
    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  if (loading) {
    return (
      <Card className="bg-gray-100 animate-pulse">
        <div className="aspect-video w-full"></div>
      </Card>
    );
  }

  if (!mediaUrl) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Video Tutorial</h3>
          <p className="text-muted-foreground">
            El video tutorial estará disponible próximamente
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if it's a Google Drive URL
  const isDriveUrl = mediaUrl.includes('drive.google.com');
  const driveImageUrl = isDriveUrl ? getDirectImageUrl(mediaUrl) : null;
  
  // Check if it's a YouTube URL
  const youtubeEmbedUrl = getYouTubeEmbedUrl(mediaUrl);

  // Render Google Drive image
  if (isDriveUrl && driveImageUrl) {
    return (
      <Card className="overflow-hidden shadow-xl">
        <div className="w-full">
          <img
            src={driveImageUrl}
            alt="Tutorial: Cómo comprar y acceder a los cursos"
            className="w-full h-auto"
            {...getDriveImageProps()}
          />
        </div>
      </Card>
    );
  }

  // Render YouTube video
  if (youtubeEmbedUrl) {
    return (
      <Card className="overflow-hidden shadow-xl">
        <div className="aspect-video w-full">
          <iframe
            src={youtubeEmbedUrl}
            title="Tutorial: Cómo comprar y acceder a los cursos"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </Card>
    );
  }

  // If URL doesn't match any known format
  return (
    <Card className="border-2 border-destructive">
      <CardContent className="p-12 text-center">
        <Play className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">URL no válida</h3>
        <p className="text-muted-foreground">
          Por favor, proporciona una URL válida de YouTube o Google Drive
        </p>
      </CardContent>
    </Card>
  );
};

// Helper functions para el estado y visualización de cursos
const getCursoStatus = (fecha: Date): 'futuro' | 'reciente' | 'pasado' => {
  const ahora = new Date();
  const diferenciaDias = Math.floor((fecha.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diferenciaDias > 0) return 'futuro';
  if (diferenciaDias >= -30) return 'reciente'; // Últimos 30 días
  return 'pasado';
};

const getCursoStatusBadge = (fecha: Date) => {
  const status = getCursoStatus(fecha);
  
  switch (status) {
    case 'futuro':
      return <Badge className="bg-green-100 text-green-800 text-xs">Próximo</Badge>;
    case 'reciente':
      return <Badge className="bg-blue-100 text-blue-800 text-xs">Disponible</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 text-xs">Archivo</Badge>;
  }
};

export default function Home() {
  const navigate = useNavigate();
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [cursosEnVivo, setCursosEnVivo] = useState<CursoEnVivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCursos, setLoadingCursos] = useState(true);

  interface StatItem {
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    label: string;
  }
  
  const stats: StatItem[] = [
    { icon: Users, value: "500+", label: "Estudiantes Activos" },
    { icon: BookOpen, value: "15+", label: "Cursos Disponibles" }
  ];

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('featured', true)
          .eq('is_active', true)
          .limit(3);

        if (error) throw error;
        setFeaturedCourses(data || []);
      } catch (error) {
        console.error('Error fetching featured courses:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCursosEnVivo = async () => {
      try {
        console.log('🏠 HOME: Obteniendo cursos en vivo...');
        const cursos = await googleSheetsService.getCursosEnVivo();
        console.log('🏠 HOME: Cursos obtenidos:', cursos.length);
        console.log('🏠 HOME: Cursos completos:', cursos);
        
        const ahora = new Date();
        console.log('🏠 HOME: Fecha actual:', ahora.toISOString());
        
        // Obtener solo los próximos 3 cursos
        const proximosCursos = cursos
          .filter(curso => {
            const fechaCurso = new Date(curso.date);
            const esFuturo = fechaCurso >= ahora;
            console.log(`🏠 HOME: Curso "${curso.title}" - Fecha: ${fechaCurso.toISOString()}, Es futuro: ${esFuturo}`);
            return esFuturo;
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
          
        // Si no hay cursos futuros, tomar los 3 más recientes
        const cursosAMostrar = proximosCursos.length > 0 ? proximosCursos : cursos
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Ordenar por fecha descendente
          .slice(0, 3);
          
        console.log('🏠 HOME: Cursos próximos filtrados:', proximosCursos.length);
        console.log('🏠 HOME: Cursos a mostrar (finales):', cursosAMostrar.length);
        console.log('🏠 HOME: Cursos seleccionados:', cursosAMostrar);
        setCursosEnVivo(cursosAMostrar);
      } catch (error) {
        console.error('🏠 HOME: Error fetching cursos en vivo:', error);
      } finally {
        setLoadingCursos(false);
      }
    };

    fetchFeaturedCourses();
    fetchCursosEnVivo();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "iniciado":
        return <Badge className="bg-green-500 text-white">En vivo</Badge>;
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          {/* Overlay muy sutil solo para separar el texto del fondo */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/10"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-gray-900" 
                style={{ 
                  textShadow: '3px 3px 6px rgba(255,255,255,0.9), -1px -1px 3px rgba(0,0,0,0.4)',
                  fontWeight: '800'
                }}>
              Transforma tu Pasión por la Moda en tu{" "}
              <span className="bg-gradient-to-r from-primary via-yellow-500 to-yellow-600 bg-clip-text text-transparent" 
                    style={{ textShadow: 'none' }}>
                Profesión
              </span>
            </h1>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mx-auto max-w-3xl mb-8 shadow-lg border border-white/50">
              <p className="text-xl lg:text-2xl text-gray-800 font-semibold">
                Aprende patronaje, diseño y confección con los mejores profesionales de la industria. 
                Cursos online y clases en vivo para dominar el arte de la moda.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg shadow-lg"
                onClick={() => navigate("/auth")}
              >
                Comenzar Ahora
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-white/90 text-gray-900 border-gray-300 hover:bg-white hover:shadow-lg px-8 py-6 text-lg font-semibold"
                onClick={() => navigate("/planes")}
              >
                Ver Planes
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-white/50">
                  <stat.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-700 font-semibold">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo Acceder a los Cursos */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">¿Cómo Comprar tus Cursos?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sigue estos sencillos pasos para comenzar tu aprendizaje
            </p>
          </div>

          {/* Pasos de Compra - Horizontal */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Paso 1 */}
              <div className="relative">
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 border-primary/20">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      1
                    </div>
                    <h3 className="font-semibold text-lg mb-3">Explora</h3>
                    <p className="text-sm text-muted-foreground">
                      Navega por la sección de Cursos y encuentra el programa ideal para ti
                    </p>
                  </CardContent>
                </Card>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="relative">
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 border-primary/20">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      2
                    </div>
                    <h3 className="font-semibold text-lg mb-3">Compra</h3>
                    <p className="text-sm text-muted-foreground">
                      Haz clic en "Comprar ahora" y serás redirigido a Hotmart
                    </p>
                  </CardContent>
                </Card>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="relative">
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 border-primary/20">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      3
                    </div>
                    <h3 className="font-semibold text-lg mb-3">Registra</h3>
                    <p className="text-sm text-muted-foreground">
                      Completa tus datos de acceso y selecciona tu método de pago preferido
                    </p>
                  </CardContent>
                </Card>
                {/* Arrow for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Paso 4 */}
              <div>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-4">
                      4
                    </div>
                    <h3 className="font-semibold text-lg mb-3">¡Aprende!</h3>
                    <p className="text-sm text-muted-foreground">
                      Accede desde el botón "Accede a tus cursos" en la parte superior
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold mb-4">¿Cómo Acceder a tus Compras?</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Observa este video tutorial donde te mostramos cómo acceder a tus cursos adquiridos en Hotmart
            </p>
          </div>

          {/* Video Tutorial */}
          <div className="max-w-4xl mx-auto">
            <VideoTutorial />
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-full font-semibold">
              <Award className="h-5 w-5" />
              <span>Acceso de por vida a todos tus cursos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cursos Destacados</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubre nuestros cursos más populares y comienza tu transformación profesional hoy mismo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {loading ? (
              // Skeleton loading
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="w-full" style={{ height: 225, backgroundColor: '#d1d5db', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}></div>
                  <CardHeader>
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-300 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-300 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))
            ) : featuredCourses.length > 0 ? (
              featuredCourses.filter(course => course && course.id).slice(0, 3).map((course) => (
                <Card key={course.id} className="group hover:shadow-elegant transition-all duration-300 cursor-pointer">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img 
                      src={getDirectImageUrl(course?.thumbnail_url) || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=225&fit=crop"} 
                      alt={course?.title || 'Curso'}
                      style={{ width: '100%', height: 225, objectFit: 'cover', transition: 'transform 0.3s' }}
                      {...getDriveImageProps()}
                    />
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                      {course.level}
                    </Badge>
                  </div>
                  
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span>4.8</span>
                        <span className="mx-2">•</span>
                        <Users className="h-4 w-4 mr-1" />
                        <span>500+</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{course.duration_hours}h</span>
                      </div>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription>Por {course.instructor_name}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {course.discounted_price ? (
                          <>
                            <span className="text-lg font-bold text-primary">
                              ${course.discounted_price}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              ${course.price}
                            </span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-primary">
                            ${course.price}
                          </span>
                        )}
                      </div>
                      <Button 
                        className="group-hover:bg-primary group-hover:text-primary-foreground"
                        onClick={() => navigate(`/curso/${course.id}`)}
                      >
                        Ver Curso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay cursos destacados</h3>
                <p className="text-muted-foreground mb-4">
                  Aún no se han marcado cursos como destacados.
                </p>
                <Button variant="outline" onClick={() => navigate("/cursos")}>
                  Ver Todos los Cursos
                </Button>
              </div>
            )}
          </div>

          <div className="text-center">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/cursos")}
            >
              Ver Todos los Cursos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Clases en Vivo */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cursos En Vivo</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubre nuestros cursos de moda y diseño. Aprende patronaje, confección y técnicas profesionales con instructores expertos.
            </p>
            
            {/* Botón de debug temporal */}
            <div className="mt-4 flex gap-2 justify-center">
              <Button 
                onClick={async () => {
                  console.log('🔄 HOME: Forzando recarga de cursos...');
                  setLoadingCursos(true);
                  setCursosEnVivo([]);
                  // Limpiar cache del servicio
                  const googleSheetsService = (await import('../services/googleSheetsService')).default;
                  (googleSheetsService as any).cache = { data: null, timestamp: 0 };
                  // Recargar cursos
                  try {
                    const cursos = await googleSheetsService.getCursosEnVivo();
                    const ahora = new Date();
                    const proximosCursos = cursos
                      .filter(curso => new Date(curso.date) >= ahora)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 3);
                    const cursosAMostrar = proximosCursos.length > 0 ? proximosCursos : cursos
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 3);
                    setCursosEnVivo(cursosAMostrar);
                  } catch (error) {
                    console.error('Error:', error);
                  } finally {
                    setLoadingCursos(false);
                  }
                }}
                variant="outline" 
                size="sm"
                className="bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
              >
                Recargar Cursos
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {loadingCursos ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3 mb-2"></div>
                    <div className="h-16 bg-gray-300 rounded w-full mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))
            ) : cursosEnVivo.length > 0 ? (
              cursosEnVivo.map((curso) => (
                <Card key={curso.id} className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(curso.type)}
                        <span className="font-semibold text-sm">{curso.title}</span>
                      </div>
                      {getCursoStatusBadge(curso.date)}
                    </div>
                    
                    <div className="text-muted-foreground mb-2 text-sm">
                      {format(curso.date, "d 'de' MMMM, HH:mm", { locale: es })}
                    </div>
                    
                    <div className="text-muted-foreground text-xs mb-2">
                      Instructor: {curso.instructor}
                    </div>
                    
                    <p className="text-sm mb-4 line-clamp-2">{curso.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{curso.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{curso.students} estudiantes</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground w-full" 
                      onClick={() => navigate('/clases-en-vivo')}
                    >
                      Ver más clases en vivo
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Fallback cuando no hay cursos
              <div className="col-span-full">
                <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-8 text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Próximamente nuevas clases</h3>
                    <p className="text-muted-foreground mb-4">
                      Estamos preparando emocionantes clases en vivo. ¡Mantente atento!
                    </p>
                    
                    {/* Información de debug */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 text-left">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            <strong>Debug Info:</strong>
                          </p>
                          <ul className="mt-2 text-sm text-yellow-600 list-disc list-inside">
                            <li>Estado de carga: {loadingCursos ? 'Cargando...' : 'Completado'}</li>
                            <li>Cursos encontrados: {cursosEnVivo.length}</li>
                            <li>Revisa la consola del navegador (F12) para más detalles</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground mt-4" 
                      onClick={() => navigate('/clases-en-vivo')}
                    >
                      Ver calendario completo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground px-10 py-6 text-lg font-semibold shadow-lg hover:bg-primary/90 transition-all"
              onClick={() => navigate('/clases-en-vivo')}
            >
              Descubre todas las clases en vivo
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">¿Por Qué Elegir Peri Institute?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Somos líderes en educación de moda con una metodología única y probada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center p-8">
              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-4">Contenido de Calidad</h3>
              <p className="text-muted-foreground">
                Cursos creados por profesionales de la industria con años de experiencia.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 gradient-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <Play className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-4">Aprendizaje Práctico</h3>
              <p className="text-muted-foreground">
                Videos HD con ejercicios prácticos que puedes hacer desde casa.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 gradient-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-4">Certificación</h3>
              <p className="text-muted-foreground">
                Obtén certificados reconocidos que validen tus nuevas habilidades.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-secondary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Comienza Tu Transformación Hoy
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Únete a miles de estudiantes que ya han transformado su pasión por la moda en una carrera exitosa.
          </p>
          <div className="flex justify-center">
            <Button 
              size="lg" 
              variant="outline" 
              className="glass-effect text-white border-white/30 hover:bg-white/20 px-8 py-6 text-lg"
              onClick={() => navigate("/contacto")}
            >
              Contactar Asesor
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}