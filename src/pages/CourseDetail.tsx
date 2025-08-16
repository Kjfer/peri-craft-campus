import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  User, 
  CheckCircle, 
  Play, 
  Star,
  ShoppingCart,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { courseAPI } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  instructor_name: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  duration_hours: number;
  price: number;
  requirements?: string[];
  what_you_learn?: string[];
  modules?: Module[];
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order_number: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
  video_url?: string;
  content?: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const fetchCourseData = useCallback(async () => {
    try {
      // Fetch course using API
      const courseResponse = await courseAPI.getById(id!);
      
      if (courseResponse.success && courseResponse.course) {
        setCourse(courseResponse.course);
        setModules(courseResponse.course.modules || []);
      } else {
        throw new Error('Course not found');
      }

      // Check enrollment if user is logged in
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .single();

        setIsEnrolled(!!enrollmentData);
      }
    } catch (error: unknown) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar la información del curso.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, user, toast]);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, fetchCourseData]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (course?.price === 0) {
      // Free course - enroll directly
      setEnrolling(true);
      try {
        const { error } = await supabase
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: id!
          });

        if (error) throw error;

        setIsEnrolled(true);
        toast({
          title: "¡Inscripción exitosa!",
          description: "Te has inscrito al curso correctamente.",
        });
      } catch (error) {
        console.error('Error enrolling:', error);
        toast({
          title: "Error",
          description: "No se pudo completar la inscripción.",
          variant: "destructive",
        });
      } finally {
        setEnrolling(false);
      }
    } else {
      // Paid course - redirect to payment
      navigate(`/checkout/course/${id}`);
    }
  };

  const handleStartCourse = () => {
    if (isEnrolled || allLessons.some(lesson => lesson.is_free)) {
      navigate(`/curso/${id}/lecciones`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Curso no encontrado</h1>
          <Button onClick={() => navigate('/cursos')}>Volver al catálogo</Button>
        </div>
      </div>
    );
  }

  // Calculate lessons from modules
  const allLessons = modules.flatMap(module => module.lessons);
  const totalLessons = allLessons.length;
  const freeLessons = allLessons.filter(lesson => lesson.is_free).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Hero Section */}
      <section className="py-12 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-white/20 text-white">{course.category}</Badge>
                <h1 className="text-4xl font-bold">{course.title}</h1>
                <p className="text-xl opacity-90">{course.short_description}</p>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {course.instructor_name}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {course.duration_hours} horas
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {totalLessons} lecciones
                </div>
                <Badge variant="secondary">{course.level}</Badge>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold">
                  {course.price === 0 ? 'Gratis' : `$${course.price.toFixed(2)}`}
                </span>
                {freeLessons > 0 && (
                  <span className="text-sm opacity-75">
                    {freeLessons} lección{freeLessons !== 1 ? 'es' : ''} gratis
                  </span>
                )}
              </div>

              <div className="flex space-x-4">
                {isEnrolled ? (
                  <Button size="lg" onClick={handleStartCourse} className="bg-white text-primary hover:bg-white/90">
                    <Play className="w-4 h-4 mr-2" />
                    Continuar Curso
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="bg-white text-primary hover:bg-white/90"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {enrolling ? 'Inscribiendo...' : course.price === 0 ? 'Inscribirse Gratis' : 'Comprar Curso'}
                  </Button>
                )}
                {!isEnrolled && freeLessons > 0 && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={handleStartCourse}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Vista Previa
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:justify-self-end">
              <div className="aspect-video relative overflow-hidden rounded-lg shadow-2xl">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <span className="text-6xl font-bold opacity-50">
                      {course.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Descripción</TabsTrigger>
              <TabsTrigger value="curriculum">Temario</TabsTrigger>
              <TabsTrigger value="requirements">Requisitos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre este curso</CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                  
                  {course.what_you_learn && course.what_you_learn.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">¿Qué aprenderás?</h3>
                      <ul className="space-y-2">
                        {course.what_you_learn.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Contenido del curso</CardTitle>
                  <CardDescription>
                    {modules.length} módulo{modules.length !== 1 ? 's' : ''} • {totalLessons} lecciones • {course.duration_hours} horas total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {modules.length > 0 ? (
                      modules.map((module, moduleIndex) => (
                        <div key={module.id} className="space-y-4">
                          {/* Module Header */}
                          <div className="flex items-center space-x-3 p-4 bg-primary/5 rounded-lg border">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                              {module.order_number}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{module.title}</h3>
                              {module.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {module.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {module.lessons.length} lección{module.lessons.length !== 1 ? 'es' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Module Lessons */}
                          {module.lessons.length > 0 && (
                            <div className="ml-4 space-y-2">
                              {module.lessons.map((lesson, lessonIndex) => (
                                <div key={lesson.id}>
                                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                        {lesson.order_number}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-sm">{lesson.title}</h4>
                                        {lesson.description && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {lesson.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-xs text-muted-foreground">
                                        {lesson.duration_minutes} min
                                      </span>
                                      {lesson.is_free && (
                                        <Badge variant="secondary" className="text-xs">Gratis</Badge>
                                      )}
                                      {(isEnrolled || lesson.is_free) ? (
                                        <Play className="w-3 h-3 text-primary" />
                                      ) : (
                                        <div className="w-3 h-3 rounded-full border-2 border-muted" />
                                      )}
                                    </div>
                                  </div>
                                  {lessonIndex < module.lessons.length - 1 && <Separator className="ml-10" />}
                                </div>
                              ))}
                            </div>
                          )}
                          {moduleIndex < modules.length - 1 && <Separator className="my-6" />}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          El contenido del curso se está preparando. Pronto estará disponible.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requirements" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Requisitos</CardTitle>
                </CardHeader>
                <CardContent>
                  {course.requirements && course.requirements.length > 0 ? (
                    <ul className="space-y-2">
                      {course.requirements.map((requirement, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      No se requieren conocimientos previos para este curso.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}