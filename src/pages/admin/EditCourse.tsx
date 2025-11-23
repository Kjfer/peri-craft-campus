import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoUpload } from "@/components/admin/VideoUpload";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Lesson {
  id?: string;
  title: string;
  description: string;
  content: string;
  video_url: string;
  duration_minutes: number;
  is_free: boolean;
}

interface Module {
  id?: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface CourseFormData {
  title: string;
  description: string;
  short_description: string;
  target_audience?: string[];
  teaching_method?: string;
  what_you_learn?: string[];
  requirements?: string[];
  categories: string[];
  level: string;
  instructor_name: string;
  duration_hours: number;
  price: number;
  discounted_price?: number;
  thumbnail_url?: string;
  syllabus_pdf_url?: string;
  featured: boolean;
  status: 'active' | 'inactive' | 'draft';
  modules: Module[];
}

// Sortable Module Component
interface SortableModuleCardProps {
  module: Module;
  moduleIndex: number;
  expandedModules: { [key: string]: boolean };
  toggleModuleExpansion: (index: string) => void;
  updateModule: (index: number, field: keyof Module, value: string) => void;
  removeModule: (index: number) => void;
  addLesson: (moduleIndex: number) => void;
  updateLesson: (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: string | number | boolean) => void;
  removeLesson: (moduleIndex: number, lessonIndex: number) => void;
  handleLessonDragEnd: (moduleIndex: number) => (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function SortableModuleCard({
  module,
  moduleIndex,
  expandedModules,
  toggleModuleExpansion,
  updateModule,
  removeModule,
  addLesson,
  updateLesson,
  removeLesson,
  handleLessonDragEnd,
  sensors
}: SortableModuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: moduleIndex.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Módulo</Label>
                  <Input
                    value={module.title}
                    onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                    placeholder="Ej: Introducción a React"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción del Módulo</Label>
                  <Input
                    value={module.description}
                    onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                    placeholder="Descripción breve del módulo"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => toggleModuleExpansion(moduleIndex.toString())}
            >
              {expandedModules[moduleIndex.toString()] ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => removeModule(moduleIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expandedModules[moduleIndex.toString()] && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Lecciones del Módulo</h4>
              <Button
                type="button"
                variant="outline"
                onClick={() => addLesson(moduleIndex)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Lección
              </Button>
            </div>
            
            {module.lessons.length === 0 ? (
              <p className="text-muted-foreground text-center py-2">
                No hay lecciones. Agrega la primera lección.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLessonDragEnd(moduleIndex)}
              >
                <SortableContext
                  items={module.lessons.map((_, i) => `${moduleIndex}-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <SortableLessonCard
                        key={`${moduleIndex}-${lessonIndex}`}
                        lesson={lesson}
                        moduleIndex={moduleIndex}
                        lessonIndex={lessonIndex}
                        updateLesson={updateLesson}
                        removeLesson={removeLesson}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Sortable Lesson Component
interface SortableLessonCardProps {
  lesson: Lesson;
  moduleIndex: number;
  lessonIndex: number;
  updateLesson: (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: string | number | boolean) => void;
  removeLesson: (moduleIndex: number, lessonIndex: number) => void;
}

function SortableLessonCard({
  lesson,
  moduleIndex,
  lessonIndex,
  updateLesson,
  removeLesson
}: SortableLessonCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${moduleIndex}-${lessonIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título de la Lección</Label>
                <Input
                  value={lesson.title}
                  onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'title', e.target.value)}
                  placeholder="Ej: ¿Qué es React?"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={lesson.description}
                  onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'description', e.target.value)}
                  placeholder="Descripción de la lección"
                />
              </div>
              <div className="md:col-span-2">
                <VideoUpload
                  lessonId={lesson.id || `temp-${moduleIndex}-${lessonIndex}`}
                  currentVideoUrl={lesson.video_url}
                  onUploadComplete={(videoUrl) => updateLesson(moduleIndex, lessonIndex, 'video_url', videoUrl)}
                />
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">
                    O usa URL de YouTube/Externo
                  </Label>
                  <Input
                    value={lesson.video_url}
                    onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=... (opcional)"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duración (minutos)</Label>
                <Input
                  type="number"
                  value={lesson.duration_minutes}
                  onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'duration_minutes', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Contenido de la Lección</Label>
              <Textarea
                value={lesson.content}
                onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'content', e.target.value)}
                placeholder="Contenido detallado de la lección..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`lesson-${moduleIndex}-${lessonIndex}-free`}
                  checked={lesson.is_free}
                  onCheckedChange={(checked) => updateLesson(moduleIndex, lessonIndex, 'is_free', checked)}
                />
                <Label htmlFor={`lesson-${moduleIndex}-${lessonIndex}-free`}>
                  Lección Gratuita
                </Label>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeLesson(moduleIndex, lessonIndex)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Lección
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    short_description: "",
    target_audience: [],
    teaching_method: "",
    what_you_learn: [],
    requirements: [],
    categories: [],
    level: "Principiante",
    instructor_name: "",
    duration_hours: 0,
    price: 0,
    discounted_price: undefined,
    thumbnail_url: "",
    syllabus_pdf_url: "",
    featured: false,
    status: "active",
    modules: []
  });

  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      
      // Obtener datos del curso
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id!)
        .single();
      
      if (courseError) {
        throw courseError;
      }
      
      if (course) {
        // Obtener módulos del curso
        const { data: modules, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', id!)
          .order('order_number', { ascending: true });
        
        if (modulesError) {
          console.error('Error loading modules:', modulesError);
        }
        
        // Obtener lecciones para cada módulo
        const modulesWithLessons = await Promise.all(
          (modules || []).map(async (module) => {
            const { data: lessons, error: lessonsError } = await supabase
              .from('lessons')
              .select('*')
              .eq('module_id', module.id)
              .order('order_number', { ascending: true });
            
            if (lessonsError) {
              console.error('Error loading lessons for module:', module.id, lessonsError);
            }
            
            return {
              id: module.id,
              title: module.title,
              description: module.description || "",
              lessons: (lessons || []).map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                description: lesson.description || "",
                content: lesson.content || "",
                video_url: lesson.video_url,
                duration_minutes: lesson.duration_minutes,
                is_free: lesson.is_free
              }))
            };
          })
        );
        
        setFormData({
          title: course.title || "",
          description: course.description || "",
          short_description: course.short_description || "",
          target_audience: Array.isArray(course.target_audience) ? course.target_audience : course.target_audience ? [course.target_audience] : [],
          teaching_method: course.teaching_method || "",
          what_you_learn: Array.isArray(course.what_you_learn) ? course.what_you_learn : [],
          requirements: Array.isArray(course.requirements) ? course.requirements : [],
          categories: Array.isArray(course.category) ? course.category : course.category ? [course.category] : [],
          level: course.level || "Principiante",
          instructor_name: course.instructor_name || "",
          duration_hours: course.duration_hours || 0,
          price: course.price || 0,
          discounted_price: course.discounted_price || undefined,
          thumbnail_url: course.thumbnail_url || "",
          syllabus_pdf_url: course.syllabus_pdf_url || "",
          featured: course.featured || false,
          status: course.status || "active",
          modules: modulesWithLessons
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching course:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar el curso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id, fetchCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "El título y la descripción son obligatorios",
        variant: "destructive"
      });
      return;
    }

    if (formData.price < 0) {
      toast({
        title: "Error",
        description: "El precio no puede ser negativo",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      // Preparar datos del curso incluyendo módulos
      const courseUpdateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        short_description: formData.short_description?.trim() || null,
        target_audience: formData.target_audience || null,
        teaching_method: formData.teaching_method?.trim() || null,
        what_you_learn: formData.what_you_learn || null,
        requirements: formData.requirements || null,
        category: formData.categories,
        level: formData.level,
        instructor_name: formData.instructor_name.trim(),
        duration_hours: formData.duration_hours,
        price: formData.price,
        discounted_price: formData.discounted_price || null,
        thumbnail_url: formData.thumbnail_url?.trim() || null,
        syllabus_pdf_url: formData.syllabus_pdf_url?.trim() || null,
        featured: formData.featured,
        status: formData.status,
        modules: formData.modules.map((module, index) => ({
          title: module.title,
          description: module.description,
          order_number: index + 1,
          lessons: module.lessons.map((lesson, lessonIndex) => ({
            title: lesson.title,
            description: lesson.description,
            content: lesson.content,
            video_url: lesson.video_url,
            duration_minutes: lesson.duration_minutes,
            order_number: lessonIndex + 1,
            is_free: lesson.is_free
          }))
        }))
      };
      
      // Obtener el token de autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Actualizar curso usando la API del backend
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(courseUpdateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar el curso');
      }
      
      toast({
        title: "Éxito",
        description: "Curso actualizado correctamente con todos sus módulos y lecciones"
      });
      navigate("/admin/cursos");
    } catch (error: unknown) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el curso",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CourseFormData, value: string | number | boolean | string[] | Module[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Module Management Functions
  const addModule = () => {
    const newModule: Module = {
      title: "",
      description: "",
      lessons: []
    };
    setFormData(prev => ({
      ...prev,
      modules: [...prev.modules, newModule]
    }));
  };

  const updateModule = (index: number, field: keyof Module, value: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === index ? { ...module, [field]: value } : module
      )
    }));
  };

  const removeModule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== index)
    }));
  };

  const addLesson = (moduleIndex: number) => {
    const newLesson: Lesson = {
      title: "",
      description: "",
      content: "",
      video_url: "",
      duration_minutes: 0,
      is_free: false
    };
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === moduleIndex 
          ? { ...module, lessons: [...module.lessons, newLesson] }
          : module
      )
    }));
  };

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === moduleIndex 
          ? {
              ...module,
              lessons: module.lessons.map((lesson, j) => 
                j === lessonIndex ? { ...lesson, [field]: value } : lesson
              )
            }
          : module
      )
    }));
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === moduleIndex 
          ? { ...module, lessons: module.lessons.filter((_, j) => j !== lessonIndex) }
          : module
      )
    }));
  };

  const toggleModuleExpansion = (index: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.modules.findIndex((_, i) => i.toString() === active.id);
        const newIndex = prev.modules.findIndex((_, i) => i.toString() === over.id);
        return {
          ...prev,
          modules: arrayMove(prev.modules, oldIndex, newIndex)
        };
      });
    }
  };

  const handleLessonDragEnd = (moduleIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const module = prev.modules[moduleIndex];
        const oldIndex = module.lessons.findIndex((_, i) => `${moduleIndex}-${i}` === active.id);
        const newIndex = module.lessons.findIndex((_, i) => `${moduleIndex}-${i}` === over.id);
        
        const newLessons = arrayMove(module.lessons, oldIndex, newIndex);
        
        return {
          ...prev,
          modules: prev.modules.map((m, i) => 
            i === moduleIndex ? { ...m, lessons: newLessons } : m
          )
        };
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/cursos")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Curso</h1>
            <p className="text-muted-foreground">
              Modifica la información del curso
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>
                Información fundamental del curso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Título del curso"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Descripción Corta</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  placeholder="Breve descripción del curso"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción detallada del curso"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">¿A quiénes va dirigido? (una línea por ítem)</Label>
                <Textarea
                  id="target_audience"
                  value={formData.target_audience?.join('\n') || ''}
                  onChange={(e) => handleInputChange('target_audience', e.target.value.split('\n').filter(line => line.trim()))}
                  placeholder="Escribe cada ítem en una nueva línea&#10;Ejemplo:&#10;Estudiantes de moda&#10;Diseñadores principiantes&#10;Profesionales del textil"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Cada línea se mostrará como un ítem con viñeta
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teaching_method">Método de Enseñanza</Label>
                <Textarea
                  id="teaching_method"
                  value={formData.teaching_method}
                  onChange={(e) => handleInputChange('teaching_method', e.target.value)}
                  placeholder="Describe el método de enseñanza utilizado en este curso"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="what_you_learn">Objetivos (¿Qué aprenderás?) - una línea por objetivo</Label>
                <Textarea
                  id="what_you_learn"
                  value={formData.what_you_learn?.join('\n') || ''}
                  onChange={(e) => handleInputChange('what_you_learn', e.target.value.split('\n').filter(line => line.trim()))}
                  placeholder="Escribe cada objetivo en una nueva línea&#10;Ejemplo:&#10;Dominar las técnicas de patronaje&#10;Crear diseños profesionales&#10;Aplicar conceptos avanzados"
                  rows={5}
                />
                <p className="text-sm text-muted-foreground">
                  Cada línea se mostrará como un objetivo con viñeta
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requisitos (una línea por requisito)</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements?.join('\n') || ''}
                  onChange={(e) => handleInputChange('requirements', e.target.value.split('\n').filter(line => line.trim()))}
                  placeholder="Escribe cada requisito en una nueva línea&#10;Ejemplo:&#10;Conocimientos básicos de costura&#10;Computadora con internet&#10;Ganas de aprender"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Cada línea se mostrará como un requisito con viñeta
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Nivel *</Label>
                  <Select 
                    value={formData.level}
                    onValueChange={(value) => handleInputChange('level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Principiante">Principiante</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instructor_name">Instructor *</Label>
                  <Input
                    id="instructor_name"
                    type="text"
                    value={formData.instructor_name}
                    onChange={(e) => handleInputChange('instructor_name', e.target.value)}
                    placeholder="Nombre del instructor"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_hours">Duración (horas) *</Label>
                  <Input
                    id="duration_hours"
                    type="number"
                    min="0"
                    value={formData.duration_hours || ''}
                    onChange={(e) => handleInputChange('duration_hours', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categories">Categorías *</Label>
                <div className="border rounded-md p-3 space-y-2">
                  {["Patronaje", "Diseño de Moda", "Confección", "Textiles", "Bordado", "Costura", "Sastrería"].map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={formData.categories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('categories', [...formData.categories, category]);
                          } else {
                            handleInputChange('categories', formData.categories.filter(c => c !== category));
                          }
                        }}
                      />
                      <Label htmlFor={`category-${category}`} className="text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Selecciona al menos una categoría
                  </p>
                )}
              </div>


              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">URL de Imagen</Label>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="syllabus_pdf_url">URL del PDF del Syllabus</Label>
                <Input
                  id="syllabus_pdf_url"
                  type="url"
                  value={formData.syllabus_pdf_url}
                  onChange={(e) => handleInputChange('syllabus_pdf_url', e.target.value)}
                  placeholder="https://ejemplo.com/syllabus.pdf"
                />
                <p className="text-sm text-muted-foreground">
                  Si no se proporciona, se generará automáticamente un PDF con el contenido del curso
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
              <CardDescription>
                Configuración de precios del curso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discounted_price">Precio con Descuento</Label>
                  <Input
                    id="discounted_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discounted_price || ""}
                    onChange={(e) => handleInputChange('discounted_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modules Section */}
          <Card>
            <CardHeader>
              <CardTitle>Módulos del Curso</CardTitle>
              <CardDescription>
                Organiza el contenido del curso en módulos y lecciones. Arrastra para reordenar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.modules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay módulos creados. Agrega el primer módulo.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleModuleDragEnd}
                >
                  <SortableContext
                    items={formData.modules.map((_, i) => i.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {formData.modules.map((module, moduleIndex) => (
                      <SortableModuleCard
                        key={moduleIndex}
                        module={module}
                        moduleIndex={moduleIndex}
                        expandedModules={expandedModules}
                        toggleModuleExpansion={toggleModuleExpansion}
                        updateModule={updateModule}
                        removeModule={removeModule}
                        addLesson={addLesson}
                        updateLesson={updateLesson}
                        removeLesson={removeLesson}
                        handleLessonDragEnd={handleLessonDragEnd}
                        sensors={sensors}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
              <Button type="button" onClick={addModule} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Módulo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuraciones Especiales</CardTitle>
              <CardDescription>
                Opciones adicionales del curso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleInputChange('featured', checked)}
                />
                <Label htmlFor="featured">
                  Curso Destacado
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Los cursos destacados aparecen en la página principal
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/cursos")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default EditCourse;
