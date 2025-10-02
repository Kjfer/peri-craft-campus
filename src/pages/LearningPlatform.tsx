import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import UniversalVideoPlayer from "@/components/video/UniversalVideoPlayer";
import { 
  Play, 
  CheckCircle, 
  Circle, 
  BookOpen, 
  Clock, 
  Award,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Module {
  id: string;
  title: string;
  description: string;
  order_number: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration_minutes: number;
  order_number: number;
  module_id: string;
  is_free: boolean;
  content?: string;
}

import type { Course } from "@/types/course";

interface CourseProgress {
  id: string;
  lesson_id: string;
  completed: boolean;
  watch_time_seconds: number;
  completed_at?: string;
}

// YouTube URL parser with enhanced debugging


export default function LearningPlatform() {
  const { courseId, lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { access, loading: accessLoading } = useCourseAccess(courseId!);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchTime, setWatchTime] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!courseId) {
      navigate("/dashboard");
      return;
    }

    console.log('🔍 LearningPlatform access check:', {
      hasUser: !!user,
      courseId,
      accessLoading,
      hasAccess: access?.hasAccess
    });

    if (!accessLoading && (!access || !access.hasAccess)) {
      console.log('❌ Access denied, redirecting to course detail');
      toast({
        title: "Acceso denegado",
        description: "No tienes acceso a este curso. Adquiere el curso para continuar.",
        variant: "destructive",
      });
      navigate(`/curso/${courseId}`);
      return;
    }
  }, [user, courseId, access, accessLoading, navigate, toast]);

  useEffect(() => {
    if (access?.hasAccess && courseId) {
      fetchCourseData();
    }
  }, [access, courseId]);

  useEffect(() => {
    if (lessonId && modules.length > 0) {
      findAndSetCurrentLesson(lessonId);
    } else if (modules.length > 0 && !lessonId) {
      // Auto-select first lesson if none specified
      const firstModule = modules[0];
      if (firstModule.lessons.length > 0) {
        const firstLesson = firstModule.lessons[0];
        navigate(`/learn/${courseId}/lesson/${firstLesson.id}`, { replace: true });
      }
    }
  }, [lessonId, modules, courseId, navigate]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching course data for:', courseId);

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId!)
        .single();

      if (courseError) {
        console.error('❌ Error fetching course:', courseError);
        throw courseError;
      }
      
      console.log('✅ Course data fetched:', courseData);
      setCourse(courseData);

      // Fetch modules with lessons
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons!lessons_module_id_fkey (*)
        `)
        .eq('course_id', courseId!)
        .order('order_number');

      if (modulesError) {
        console.error('❌ Error fetching modules:', modulesError);
        throw modulesError;
      }
      
      console.log('📋 Raw modules data:', modulesData);
      
      const sortedModules = (modulesData || []).map(module => ({
        ...module,
        lessons: (module.lessons || []).sort((a: any, b: any) => a.order_number - b.order_number)
      }));
      
      console.log('📚 Processed modules:', sortedModules);
      setModules(sortedModules);
      
      // Open first module by default
      if (sortedModules.length > 0) {
        setOpenModules(new Set([sortedModules[0].id]));
      }

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user!.id);

      if (progressError) {
        console.error('❌ Error fetching progress:', progressError);
      } else {
        console.log('📊 Progress data:', progressData);
        setCourseProgress(progressData || []);
      }

    } catch (error) {
      console.error('❌ Error fetching course data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del curso.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const findAndSetCurrentLesson = (lessonId: string) => {
    console.log('🔍 Finding lesson:', lessonId);
    for (const module of modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) {
        console.log('✅ Found lesson:', lesson);
        setCurrentLesson(lesson);
        setOpenModules(prev => new Set(prev).add(module.id));
        break;
      }
    }
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const selectLesson = (lesson: Lesson) => {
    console.log('🎯 Selecting lesson:', lesson.title);
    navigate(`/learn/${courseId}/lesson/${lesson.id}`);
  };

  const markLessonComplete = async (lessonId: string) => {
    try {
      console.log('✅ Marking lesson complete:', lessonId);
      
      const { error } = await supabase
        .from('course_progress')
        .upsert({
          user_id: user!.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
          watch_time_seconds: watchTime
        });

      if (error) throw error;

      // Update local progress state
      setCourseProgress(prev => {
        const existing = prev.find(p => p.lesson_id === lessonId);
        if (existing) {
          return prev.map(p => 
            p.lesson_id === lessonId 
              ? { ...p, completed: true, completed_at: new Date().toISOString() }
              : p
          );
        } else {
          return [...prev, {
            id: `${user!.id}-${lessonId}`,
            lesson_id: lessonId,
            completed: true,
            watch_time_seconds: watchTime,
            completed_at: new Date().toISOString()
          }];
        }
      });

      toast({
        title: "¡Lección completada!",
        description: "Tu progreso ha sido guardado.",
      });

      // Auto-advance to next lesson
      const nextLesson = getNextLesson();
      if (nextLesson) {
        setTimeout(() => {
          selectLesson(nextLesson);
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error marking lesson complete:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el progreso.",
        variant: "destructive",
      });
    }
  };

  const getNextLesson = (): Lesson | null => {
    if (!currentLesson) return null;
    
    for (const module of modules) {
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      if (lessonIndex !== -1) {
        // Try next lesson in same module
        if (lessonIndex < module.lessons.length - 1) {
          return module.lessons[lessonIndex + 1];
        }
        
        // Try first lesson of next module
        const moduleIndex = modules.findIndex(m => m.id === module.id);
        if (moduleIndex < modules.length - 1) {
          const nextModule = modules[moduleIndex + 1];
          if (nextModule.lessons.length > 0) {
            return nextModule.lessons[0];
          }
        }
      }
    }
    return null;
  };

  const getPreviousLesson = (): Lesson | null => {
    if (!currentLesson) return null;
    
    for (const module of modules) {
      const lessonIndex = module.lessons.findIndex(l => l.id === currentLesson.id);
      if (lessonIndex !== -1) {
        // Try previous lesson in same module
        if (lessonIndex > 0) {
          return module.lessons[lessonIndex - 1];
        }
        
        // Try last lesson of previous module
        const moduleIndex = modules.findIndex(m => m.id === module.id);
        if (moduleIndex > 0) {
          const prevModule = modules[moduleIndex - 1];
          if (prevModule.lessons.length > 0) {
            return prevModule.lessons[prevModule.lessons.length - 1];
          }
        }
      }
    }
    return null;
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return courseProgress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const calculateProgress = (): number => {
    const totalLessons = modules.reduce((acc, module) => acc + module.lessons.length, 0);
    const completedLessons = courseProgress.filter(p => p.completed).length;
    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  };

  if (accessLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (!access?.hasAccess) {
    console.log('🚫 LearningPlatform: No access to course', { access });
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar - Course Navigation */}
        <div className="w-80 border-r bg-muted/30 min-h-screen">
          <div className="p-4 border-b">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
            
            {course && (
              <div>
                <h2 className="font-bold text-lg mb-2 line-clamp-2">{course.title}</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Por {course.instructor_name}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso del curso</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-4 space-y-2">
              {modules.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay módulos disponibles</p>
                </div>
              ) : (
                modules.map((module) => (
                  <Collapsible 
                    key={module.id} 
                    open={openModules.has(module.id)}
                    onOpenChange={() => toggleModule(module.id)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">{module.title}</span>
                      </div>
                      {openModules.has(module.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="ml-6 space-y-1">
                      {module.lessons.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">No hay lecciones</p>
                      ) : (
                        module.lessons.map((lesson) => (
                          <Button
                            key={lesson.id}
                            variant={currentLesson?.id === lesson.id ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start h-auto p-3"
                            onClick={() => selectLesson(lesson)}
                          >
                            <div className="flex items-start gap-2 w-full">
                              <div className="flex items-center gap-2">
                                {isLessonCompleted(lesson.id) ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : currentLesson?.id === lesson.id ? (
                                  <PlayCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium line-clamp-2">
                                  {lesson.title}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration_minutes} min
                                  {lesson.is_free && (
                                    <Badge variant="outline" className="text-xs">
                                      Gratis
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Button>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content - Video Player */}
        <div className="flex-1">
          {currentLesson ? (
            <div className="p-6">
              {/* Video Player */}
              <Card className="mb-6">
                <CardContent className="p-0">
                  <div className="bg-black rounded-lg overflow-hidden">
                    <UniversalVideoPlayer 
                      videoUrl={currentLesson.video_url}
                      title={currentLesson.title}
                      onTimeUpdate={setWatchTime}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Lesson Info */}
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
                    <p className="text-muted-foreground mb-4">
                      {currentLesson.description || 'No hay descripción disponible.'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {currentLesson.duration_minutes} minutos
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {modules.find(m => m.lessons.some(l => l.id === currentLesson.id))?.title}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isLessonCompleted(currentLesson.id) && (
                      <Button
                        onClick={() => markLessonComplete(currentLesson.id)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Marcar como completada
                      </Button>
                    )}
                    {isLessonCompleted(currentLesson.id) && (
                      <Badge variant="secondary" className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Completada
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Lesson Content */}
                {currentLesson.content && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Contenido de la lección</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        {currentLesson.content}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const prevLesson = getPreviousLesson();
                      if (prevLesson) selectLesson(prevLesson);
                    }}
                    disabled={!getPreviousLesson()}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Lección Anterior
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const nextLesson = getNextLesson();
                      if (nextLesson) {
                        selectLesson(nextLesson);
                      } else {
                        toast({
                          title: "¡Curso completado!",
                          description: "Has terminado todas las lecciones del curso.",
                        });
                      }
                    }}
                    disabled={!getNextLesson()}
                    className="gap-2"
                  >
                    Siguiente Lección
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Selecciona una lección</h2>
                <p className="text-muted-foreground">
                  Elige una lección del menú lateral para comenzar tu aprendizaje.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}