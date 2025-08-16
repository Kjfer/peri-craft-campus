import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Users, Award, Star, ArrowRight, BookOpen, Clock, TrendingUp } from "lucide-react";
import { courseAPI } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  duration_hours: number;
  price: number;
  discounted_price?: number;
  featured: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        setLoading(true);
        const response = await courseAPI.getAll();
        
        if (response.success && response.courses) {
          // Filtrar solo los cursos destacados
          const featured = response.courses.filter(course => course.featured);
          setFeaturedCourses(featured);
        }
      } catch (error) {
        console.error('Error fetching featured courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedCourses();
  }, []);

  const stats = [
    { icon: Users, label: "Estudiantes", value: "10,000+" },
    { icon: BookOpen, label: "Cursos", value: "150+" },
    { icon: Award, label: "Certificados", value: "8,500+" },
    { icon: TrendingUp, label: "Satisfacción", value: "98%" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 gradient-secondary opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop')] bg-cover bg-center"></div>
        
        <div className="relative container mx-auto px-4 text-center text-white">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6">
            Domina la 
            <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              {" "}Moda
            </span>
          </h1>
          <p className="text-xl lg:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Aprende diseño, confección y patronaje con los mejores profesionales. 
            Cursos prácticos que te llevarán del concepto a la realidad.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
              onClick={() => navigate("/cursos")}
            >
              <Play className="mr-2 h-5 w-5" />
              Explorar Cursos
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
                <div className="text-sm text-white/80">{stat.label}</div>
              </div>
            ))}
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
                  <div className="w-full h-48 bg-gray-300 rounded-t-lg"></div>
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
              featuredCourses.slice(0, 3).map((course) => (
                <Card key={course.id} className="group hover:shadow-elegant transition-all duration-300 cursor-pointer">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img 
                      src={course.thumbnail_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=225&fit=crop"} 
                      alt={course.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
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