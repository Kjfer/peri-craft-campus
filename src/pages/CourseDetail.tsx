import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  User, 
  CheckCircle, 
  Play, 
  Star,
  BookOpen,
  Lock,
  CreditCard,
  Shield,
  Download,
  Users,
  Calendar,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import useCourseAccess from "@/hooks/useCourseAccess";
import type { Course } from "@/types/course";
import { generateSyllabusPDF } from "@/utils/pdfGenerator";

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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Use course access hook to check if user has paid access
  const { access, loading: accessLoading, refreshAccess } = useCourseAccess(id || '');

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch course from Supabase
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;

      // Fetch modules and lessons
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons (*)
        `)
        .eq('course_id', id)
        .order('order_number');

      if (modulesError) throw modulesError;

      setCourse(courseData);
      setModules(modulesData || []);
    } catch (error: unknown) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, fetchCourseData]);

  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para comprar cursos",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!course) return;

    // Ir directamente al checkout del curso
    navigate(`/checkout/curso/${course.id}`);
  };

  const handleLessonClick = (lesson: Lesson) => {
    // Verificar si puede acceder al video
    const canAccessVideo = access?.hasAccess || lesson.is_free;
    
    if (canAccessVideo && lesson.video_url) {
      window.open(lesson.video_url, '_blank');
    } else if (canAccessVideo) {
      navigate(`/courses/${id}/lessons/${lesson.id}`);
    } else {
      // Mostrar información pero no permitir acceso al video
      toast({
        title: "Acceso restringido",
        description: "Necesitas comprar el curso para acceder al video de esta lección",
        variant: "destructive",
      });
    }
  };

  const handleStartCourse = () => {
    if (access?.hasAccess) {
      // Navigate to first lesson
      if (modules.length > 0 && modules[0].lessons.length > 0) {
        navigate(`/courses/${id}/lessons/${modules[0].lessons[0].id}`);
      }
    } else {
      handleBuyNow();
    }
  };

  const handleDownloadSyllabus = () => {
    if (course && modules.length > 0) {
      generateSyllabusPDF(course, modules);
      toast({
        title: "Descarga iniciada",
        description: "El syllabus se está descargando como PDF",
      });
    }
  };

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo encontrar el curso solicitado
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalDuration = modules.reduce((total, module) => 
    total + module.lessons.reduce((moduleTotal, lesson) => 
      moduleTotal + lesson.duration_minutes, 0), 0);

  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);

  const isPaid = access?.hasAccess;
  const isFree = course.price === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/cursos')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a cursos
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge variant="outline">{course.level}</Badge>
                {isPaid && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Comprado
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{course.short_description}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {course.instructor_name}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {totalLessons} lecciones
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  {course.level}
                </div>
              </div>
            </div>

            {/* Course Content Tabs */}
            <Tabs defaultValue="overview" className="bg-white rounded-lg shadow-sm">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Descripción</TabsTrigger>
                <TabsTrigger value="curriculum">Contenido</TabsTrigger>
                <TabsTrigger value="requirements">Requisitos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Descripción del curso</h3>
                  <p className="text-muted-foreground leading-relaxed">{course.description}</p>
                </div>

                {course.what_you_learn && course.what_you_learn.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">¿Qué aprenderás?</h3>
                    <ul className="space-y-2">
                      {course.what_you_learn.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="curriculum" className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Contenido del curso</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDownloadSyllabus}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Syllabus (PDF)
                  </Button>
                </div>
                <div className="space-y-4">
                  {modules.map((module) => (
                    <Card key={module.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{module.title}</span>
                          <Badge variant="outline">
                            {module.lessons.length} lecciones
                          </Badge>
                        </CardTitle>
                        {module.description && (
                          <CardDescription>{module.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {module.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isPaid || lesson.is_free
                                  ? 'hover:bg-gray-50 cursor-pointer'
                                  : 'bg-gray-50 cursor-not-allowed'
                              }`}
                              onClick={() => handleLessonClick(lesson)}
                            >
                              <div className="flex items-center space-x-3">
                                {isPaid || lesson.is_free ? (
                                  <Play className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-400" />
                                )}
                                <div>
                                  <h4 className={`font-medium ${
                                    isPaid || lesson.is_free ? 'text-gray-900' : 'text-gray-500'
                                  }`}>
                                    {lesson.title}
                                  </h4>
                                  {lesson.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {lesson.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {lesson.is_free && (
                                  <Badge variant="secondary" className="text-xs">
                                    Gratis
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {lesson.duration_minutes} min
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="requirements" className="p-6">
                <h3 className="text-xl font-semibold mb-6">Requisitos</h3>
                {course.requirements && course.requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {course.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No se requieren conocimientos previos para este curso.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Course Preview */}
              <Card>
                <div className="relative">
                  <img
                    src={course.thumbnail_url || '/placeholder.svg'}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  {!isPaid && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-t-lg">
                      <div className="text-center text-white">
                        <Lock className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Vista previa</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    {isFree ? (
                      <div className="text-3xl font-bold text-green-600">Gratis</div>
                    ) : (
                      <div className="text-3xl font-bold">${course.price}</div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {isPaid ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleStartCourse}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continuar curso
                      </Button>
                    ) : isFree ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleStartCourse}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Comenzar gratis
                      </Button>
                    ) : (
                      <>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleBuyNow}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Comprar ahora
                        </Button>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Este curso incluye:</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                        {Math.floor(totalDuration / 60)}h {totalDuration % 60}m de contenido
                      </li>
                      <li className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                        {totalLessons} lecciones
                      </li>
                      <li className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        Acceso de por vida
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 mr-1" />
                    Garantía de devolución de 30 días
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
