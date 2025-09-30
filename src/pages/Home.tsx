import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Users, Award, Star, ArrowRight, BookOpen, Clock, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import googleSheetsService, { type CursoEnVivo } from "@/services/googleSheetsService";
import type { Course } from "@/types/course";
import heroImage from "@/assets/hero-banner.jpg";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    { icon: Users, value: "200+", label: "Estudiantes Activos" },
    { icon: BookOpen, value: "15+", label: "Cursos Disponibles" },
    { icon: Award, value: "4.9/5", label: "Calificación Promedio" },
    { icon: TrendingUp, value: "95%", label: "Tasa de Éxito" }
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
        const cursos = await googleSheetsService.getCursosEnVivo();
        // Obtener solo los próximos 3 cursos
        const proximosCursos = cursos
          .filter(curso => new Date(curso.date) >= new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
        setCursosEnVivo(proximosCursos);
      } catch (error) {
        console.error('Error fetching cursos en vivo:', error);
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto text-white">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Transforma tu Pasión por la Moda en tu{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Profesión
              </span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
              Aprende patronaje, diseño y confección con los mejores profesionales de la industria. 
              Cursos online y clases en vivo para dominar el arte de la moda.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
                onClick={() => navigate("/auth")}
              >
                Comenzar Ahora
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="glass-effect text-white border-white/30 hover:bg-white/20 px-8 py-6 text-lg"
                onClick={() => navigate("/planes")}
              >
                Ver Planes
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="glass-effect rounded-lg p-6">
                  <stat.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/80 font-semibold">{stat.label}</div>
                </div>
              ))}
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
                      src={course?.thumbnail_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=225&fit=crop"} 
                      alt={course?.title || 'Curso'}
                      style={{ width: '100%', height: 225, objectFit: 'cover', transition: 'transform 0.3s' }}
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
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Cursos en Vivo</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Aprende en tiempo real, interactúa con instructores y resuelve tus dudas al instante. ¡Vive la experiencia de una clase en vivo y lleva tu aprendizaje al siguiente nivel!
            </p>
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
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(curso.type)}
                      <span className="font-semibold text-sm">{curso.title}</span>
                      {getStatusBadge(curso.status)}
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
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground" 
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
              onClick={() => navigate("/auth")}
            >
              Registrarse Gratis
            </Button>
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