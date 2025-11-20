import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UniversalVideoPlayer from "@/components/video/UniversalVideoPlayer";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  CheckCircle,
  Lock,
  BookOpen,
  Clock,
  User,
  MessageCircle,
  Award,
  Mail
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import useCourseAccess from "@/hooks/useCourseAccess";
import { supabase } from "@/integrations/supabase/client";

interface Lesson {
  id: string;
  title: string;
  description?: string;
  content?: string;
  video_url?: string;
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
  module_id: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order_number: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  instructor_name: string;
  modules: Module[];
}

interface LessonProgress {
  id?: string;
  lesson_id: string;
  watch_time_seconds: number;
  completed: boolean;
  completed_at?: string;
}

export default function LessonPlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialVideoTime, setInitialVideoTime] = useState<number>(0);
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false);

  // Use course access hook
  const { access, loading: accessLoading } = useCourseAccess(courseId || '');

  useEffect(() => {
    if (courseId && lessonId) {
      fetchCourseAndLesson();
      fetchLessonProgress();
      checkAllLessonsCompleted();
    }
  }, [courseId, lessonId]);

  const fetchCourseAndLesson = async () => {
    try {
      setLoading(true);
      
      // Fetch course with modules and lessons
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id, title, instructor_name,
          modules:modules!course_id (
            id, title, description, order_number,
            lessons:lessons!module_id (
              id, title, description, content, video_url, 
              duration_minutes, order_number, is_free
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError || !courseData) {
        throw new Error('Course not found');
      }

      // Sort modules and lessons by order
      const sortedModules = courseData.modules
        .sort((a: any, b: any) => a.order_number - b.order_number)
        .map((module: any) => ({
          ...module,
          lessons: module.lessons.sort((a: any, b: any) => a.order_number - b.order_number)
        }));

      // Create flat array of all lessons
      const flatLessons: Lesson[] = [];
      sortedModules.forEach((module: Module) => {
        module.lessons.forEach((lesson: Lesson) => {
          flatLessons.push({ ...lesson, module_id: module.id });
        });
      });

      const lesson = flatLessons.find(l => l.id === lessonId);
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      setCourse({ ...courseData, modules: sortedModules });
      setCurrentLesson(lesson);
      setAllLessons(flatLessons);
      
    } catch (error) {
      console.error('Error fetching course and lesson:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la lección",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonProgress = async () => {
    if (!user || !lessonId) return;

    try {
      // Primero intentar desde localStorage
      const savedTime = localStorage.getItem(`video_progress_${lessonId}`);
      
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();

      if (!error && data) {
        setLessonProgress(data);
        setVideoProgress((data.watch_time_seconds / (currentLesson?.duration_minutes * 60 || 1)) * 100);
        
        // Usar el tiempo guardado más reciente (localStorage vs DB)
        if (savedTime) {
          const localTime = parseFloat(savedTime);
          setInitialVideoTime(localTime > data.watch_time_seconds ? localTime : data.watch_time_seconds);
        } else {
          setInitialVideoTime(data.watch_time_seconds);
        }
      } else if (savedTime) {
        // Si no hay datos en DB pero sí en localStorage
        setInitialVideoTime(parseFloat(savedTime));
      }
    } catch (error) {
      console.error('Error fetching lesson progress:', error);
      
      // Intentar desde localStorage como fallback
      const savedTime = localStorage.getItem(`video_progress_${lessonId}`);
      if (savedTime) {
        setInitialVideoTime(parseFloat(savedTime));
      }
    }
  };

  const updateProgress = async (watchTimeSeconds: number, completed: boolean = false) => {
    if (!user || !lessonId) return;

    try {
      const progressData = {
        user_id: user.id,
        lesson_id: lessonId,
        watch_time_seconds: watchTimeSeconds,
        completed,
        completed_at: completed ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('course_progress')
        .upsert(progressData, { 
          onConflict: 'user_id,lesson_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      setLessonProgress(progressData);
      
      if (completed) {
        toast({
          title: "¡Lección completada!",
          description: `Has completado "${currentLesson?.title}"`,
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleMarkComplete = () => {
    if (!currentLesson) return;
    
    const totalSeconds = currentLesson.duration_minutes * 60;
    updateProgress(totalSeconds, true);
    setVideoProgress(100);
    
    // Check if all lessons are now completed
    checkAllLessonsCompleted();
  };

  const navigateToLesson = (lesson: Lesson) => {
    if (access?.hasAccess || lesson.is_free) {
      navigate(`/courses/${courseId}/lessons/${lesson.id}`);
    } else {
      toast({
        title: "Acceso restringido",
        description: "Necesitas comprar el curso para acceder a esta lección",
        variant: "destructive",
      });
    }
  };

  const getCurrentLessonIndex = () => {
    return allLessons.findIndex(l => l.id === lessonId);
  };

  const navigateToNext = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < allLessons.length - 1) {
      const nextLesson = allLessons[currentIndex + 1];
      navigateToLesson(nextLesson);
    }
  };

  const navigateToPrevious = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0) {
      const prevLesson = allLessons[currentIndex - 1];
      navigateToLesson(prevLesson);
    }
  };

  const canAccessLesson = (lesson: Lesson) => {
    return access?.hasAccess || lesson.is_free;
  };

  const checkAllLessonsCompleted = async () => {
    if (!user || !courseId) return;

    try {
      // Get all lessons for the course
      const { data: courseLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      if (lessonsError) throw lessonsError;

      // Get all completed lessons for this user
      const { data: completedLessons, error: progressError } = await supabase
        .from('course_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', courseLessons.map(l => l.id));

      if (progressError) throw progressError;

      // Check if all lessons are completed
      const allCompleted = courseLessons.length > 0 && 
                          completedLessons.length === courseLessons.length;
      
      setAllLessonsCompleted(allCompleted);
    } catch (error) {
      console.error('Error checking lesson completion:', error);
    }
  };


  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando lección...</p>
        </div>
      </div>
    );
  }

  if (!currentLesson || !course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo encontrar la lección solicitada
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check access
  if (!canAccessLesson(currentLesson)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Esta lección requiere que compres el curso para acceder a ella.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2"
              onClick={() => navigate(`/curso/${courseId}`)}
            >
              Ver curso
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentIndex = getCurrentLessonIndex();
  const progress = lessonProgress ? 
    (lessonProgress.watch_time_seconds / (currentLesson.duration_minutes * 60)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/curso/${courseId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al curso
              </Button>
              <div>
                <h1 className="font-semibold">{course.title}</h1>
                <p className="text-sm text-muted-foreground">
                  por {course.instructor_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} de {allLessons.length} lecciones
              </span>
              <Progress value={(currentIndex / allLessons.length) * 100} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player and Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {currentLesson.video_url ? (
                    <UniversalVideoPlayer
                      videoUrl={currentLesson.video_url}
                      title={currentLesson.title}
                      onTimeUpdate={(time) => {
                        setVideoProgress((time / (currentLesson.duration_minutes * 60)) * 100);
                        updateProgress(time);
                      }}
                      lessonId={currentLesson.id}
                      initialTime={initialVideoTime}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                      <div className="text-center p-8">
                        <div className="text-6xl mb-4">🔒</div>
                        <h3 className="text-xl font-semibold mb-2">Contenido Bloqueado</h3>
                        <p className="text-gray-300 mb-4">
                          Compra el curso para acceder a este video
                        </p>
                        <button
                          onClick={() => navigate(`/checkout/curso/${courseId}`)}
                          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Comprar Curso
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lesson Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-xl">{currentLesson.title}</CardTitle>
                    {lessonProgress?.completed && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completada
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {currentLesson.duration_minutes} minutos
                    </span>
                  </div>
                </div>
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="description" className="w-full">
                  <TabsList>
                    <TabsTrigger value="description">Descripción</TabsTrigger>
                    <TabsTrigger value="content">Contenido</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="description" className="mt-4">
                    {currentLesson.description ? (
                      <p className="text-muted-foreground">{currentLesson.description}</p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No hay descripción disponible para esta lección.
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="content" className="mt-4">
                    {currentLesson.content ? (
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">{currentLesson.content}</pre>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No hay contenido adicional para esta lección.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>

                <Separator className="my-6" />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={navigateToPrevious}
                      disabled={currentIndex === 0}
                    >
                      <SkipBack className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={navigateToNext}
                      disabled={currentIndex === allLessons.length - 1}
                    >
                      Siguiente
                      <SkipForward className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  
                  {!lessonProgress?.completed && (
                    <Button onClick={handleMarkComplete}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar como completada
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Certificate Message - Shown when all lessons are completed */}
            {allLessonsCompleted && (
              <Card className="border-primary bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Award className="w-5 h-5 mr-2 text-primary" />
                    ¡Felicidades! Has completado el curso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Has completado todas las lecciones de este curso. Si deseas obtener tu certificado, contáctanos:
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`https://wa.me/51920545678?text=${encodeURIComponent(`Hola, me gustaría obtener el certificado del curso ${course?.title || ''} que completé`)}`, '_blank')}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Consultar por WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.location.href = 'mailto:info@instituto.pericompanygroup.com?subject=Solicitud de certificado&body=Hola, me gustaría obtener el certificado del curso que completé.'}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar correo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Course Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Contenido del curso</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
                {course.modules.map((module) => (
                  <div key={module.id} className="border-b last:border-b-0">
                    <div className="p-4 bg-gray-50">
                      <h4 className="font-medium text-sm">{module.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {module.lessons.length} lecciones
                      </p>
                    </div>
                    <div className="space-y-1">
                      {module.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => navigateToLesson(lesson)}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                            lesson.id === lessonId 
                              ? 'border-l-primary bg-blue-50' 
                              : 'border-l-transparent'
                          }`}
                          disabled={!canAccessLesson(lesson)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {canAccessLesson(lesson) ? (
                                <Play className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              )}
                              <span className={`text-xs font-medium truncate ${
                                canAccessLesson(lesson) ? 'text-gray-900' : 'text-gray-500'
                              }`}>
                                {lesson.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              {lesson.is_free && (
                                <Badge variant="secondary" className="text-xs px-1">
                                  Gratis
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {lesson.duration_minutes}m
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
}