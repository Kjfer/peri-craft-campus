import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { courseAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CourseFormData {
  title: string;
  description: string;
  short_description: string;
  category: string;
  level: string;
  instructor_name: string;
  duration_hours: number;
  price: number;
  discounted_price?: number | null;
  thumbnail_url: string;
  what_you_learn: string[];
  requirements: string[];
  featured: boolean;
  modules: Module[];
}

interface Module {
  title: string;
  description: string;
  order_number: number;
  lessons: Lesson[];
}

interface Lesson {
  title: string;
  description: string;
  content: string;
  video_url: string;
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
}

export default function CreateCourse() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newWhatYouLearn, setNewWhatYouLearn] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [modules, setModules] = useState<Module[]>([]);

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    short_description: "",
    category: "",
    level: "Principiante",
    instructor_name: "",
    duration_hours: 0,
    price: 0,
    discounted_price: null,
    thumbnail_url: "",
    what_you_learn: [],
    requirements: [],
    featured: false,
    modules: []
  });

  const categories = [
    "Patronaje",
    "Diseño de Moda",
    "Confección",
    "Textiles",
    "Bordado",
    "Costura",
    "Sastrería"
  ];

  const levels = ["Principiante", "Intermedio", "Avanzado"];

  const handleInputChange = (field: keyof CourseFormData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addWhatYouLearn = () => {
    if (newWhatYouLearn.trim()) {
      setFormData(prev => ({
        ...prev,
        what_you_learn: [...prev.what_you_learn, newWhatYouLearn.trim()]
      }));
      setNewWhatYouLearn("");
    }
  };

  const removeWhatYouLearn = (index: number) => {
    setFormData(prev => ({
      ...prev,
      what_you_learn: prev.what_you_learn.filter((_, i) => i !== index)
    }));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  // Module management functions
  const addModule = () => {
    const newModule: Module = {
      title: "",
      description: "",
      order_number: modules.length + 1,
      lessons: []
    };
    
    setModules(prev => [...prev, newModule]);
  };

  const updateModule = (index: number, field: keyof Module, value: string | number) => {
    setModules(prev => prev.map((module, i) => 
      i === index ? { ...module, [field]: value } : module
    ));
  };

  const removeModule = (index: number) => {
    setModules(prev => prev.filter((_, i) => i !== index).map((module, i) => ({
      ...module,
      order_number: i + 1
    })));
  };

  const addLesson = (moduleIndex: number) => {
    const newLesson: Lesson = {
      title: "",
      description: "",
      content: "",
      video_url: "",
      duration_minutes: 0,
      order_number: modules[moduleIndex].lessons.length + 1,
      is_free: false
    };

    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? { ...module, lessons: [...module.lessons, newLesson] }
        : module
    ));
  };

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: string | number | boolean) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? {
            ...module,
            lessons: module.lessons.map((lesson, j) => 
              j === lessonIndex ? { ...lesson, [field]: value } : lesson
            )
          }
        : module
    ));
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? {
            ...module,
            lessons: module.lessons.filter((_, j) => j !== lessonIndex).map((lesson, j) => ({
              ...lesson,
              order_number: j + 1
            }))
          }
        : module
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Creating course with data:', formData);
      console.log('Modules to create:', modules);
      
      // Prepare course data with modules for backend
      const courseDataWithModules = {
        ...formData,
        modules: modules
      };
      
      console.log('🚀 SENDING TO BACKEND - Full object:');
      console.log('📋 Course data:', formData);
      console.log('📚 Modules array:', modules);
      console.log('🔗 Combined payload:', JSON.stringify(courseDataWithModules, null, 2));
      
      // Send to backend - it will handle creating course, modules, and lessons
      console.log('🎯 CALLING courseAPI.create() now...');
      const result = await courseAPI.create(courseDataWithModules);
      console.log('🎯 courseAPI.create() FINISHED with result:', result);
      console.log('Course creation result:', result);

      if (result.success && result.course) {
        toast({
          title: "Éxito",
          description: `Curso creado correctamente con ${modules.length} módulos y ${modules.reduce((acc, m) => acc + m.lessons.length, 0)} lecciones`
        });

        navigate('/admin/cursos');
      } else {
        throw new Error(result.error || 'Error creating course');
      }
    } catch (error: unknown) {
      console.error('Create course error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el curso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/cursos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Curso</h1>
            <p className="text-muted-foreground">
              Completa la información del curso
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>
                Datos principales del curso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Curso *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor *</Label>
                  <Input
                    id="instructor"
                    value={formData.instructor_name}
                    onChange={(e) => handleInputChange('instructor_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Descripción Corta</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción Completa *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Nivel *</Label>
                  <Select 
                    value={formData.level}
                    onValueChange={(value) => handleInputChange('level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (horas) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration_hours || ''}
                    onChange={(e) => handleInputChange('duration_hours', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discounted_price">Precio con Descuento (USD)</Label>
                  <Input
                    id="discounted_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discounted_price || ''}
                    onChange={(e) => handleInputChange('discounted_price', parseFloat(e.target.value) || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">URL de Imagen</Label>
                  <Input
                    id="thumbnail"
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleInputChange('featured', checked)}
                />
                <Label htmlFor="featured">Curso Destacado</Label>
              </div>
            </CardContent>
          </Card>

          {/* What You'll Learn */}
          <Card>
            <CardHeader>
              <CardTitle>¿Qué Aprenderás?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Agregar objetivo de aprendizaje..."
                  value={newWhatYouLearn}
                  onChange={(e) => setNewWhatYouLearn(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWhatYouLearn())}
                />
                <Button type="button" onClick={addWhatYouLearn}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {formData.what_you_learn.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span>{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWhatYouLearn(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Requisitos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Agregar requisito..."
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                />
                <Button type="button" onClick={addRequirement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {formData.requirements.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span>{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRequirement(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Módulos del Curso</CardTitle>
              <CardDescription>
                Organiza el contenido en módulos y lecciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button type="button" onClick={addModule} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Módulo
              </Button>

              <div className="space-y-6">
                {modules.map((module, moduleIndex) => (
                  <Card key={moduleIndex} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Módulo {module.order_number}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModule(moduleIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`module-title-${moduleIndex}`}>Título del Módulo *</Label>
                          <Input
                            id={`module-title-${moduleIndex}`}
                            value={module.title}
                            onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                            placeholder="Ej: Introducción al Patronaje"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`module-description-${moduleIndex}`}>Descripción del Módulo</Label>
                        <Textarea
                          id={`module-description-${moduleIndex}`}
                          value={module.description}
                          onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                          placeholder="Describe brevemente lo que se aprenderá en este módulo"
                          rows={2}
                        />
                      </div>

                      {/* Lessons for this module */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Lecciones del Módulo</Label>
                          <Button
                            type="button"
                            onClick={() => addLesson(moduleIndex)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar Lección
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <Card key={lessonIndex} className="bg-muted/50">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    Lección {lesson.order_number}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeLesson(moduleIndex, lessonIndex)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label htmlFor={`lesson-title-${moduleIndex}-${lessonIndex}`} className="text-xs">
                                      Título de la Lección *
                                    </Label>
                                    <Input
                                      id={`lesson-title-${moduleIndex}-${lessonIndex}`}
                                      value={lesson.title}
                                      onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'title', e.target.value)}
                                      placeholder="Ej: Conceptos básicos"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label htmlFor={`lesson-duration-${moduleIndex}-${lessonIndex}`} className="text-xs">
                                      Duración (minutos)
                                    </Label>
                                    <Input
                                      id={`lesson-duration-${moduleIndex}-${lessonIndex}`}
                                      type="number"
                                      value={lesson.duration_minutes}
                                      onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'duration_minutes', parseInt(e.target.value) || 0)}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <Label htmlFor={`lesson-description-${moduleIndex}-${lessonIndex}`} className="text-xs">
                                    Descripción de la Lección
                                  </Label>
                                  <Textarea
                                    id={`lesson-description-${moduleIndex}-${lessonIndex}`}
                                    value={lesson.description}
                                    onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'description', e.target.value)}
                                    placeholder="Describe el contenido de esta lección"
                                    rows={2}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label htmlFor={`lesson-video-${moduleIndex}-${lessonIndex}`} className="text-xs">
                                    URL del Video *
                                  </Label>
                                  <Input
                                    id={`lesson-video-${moduleIndex}-${lessonIndex}`}
                                    type="url"
                                    value={lesson.video_url}
                                    onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'video_url', e.target.value)}
                                    placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                                    required
                                  />
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`lesson-free-${moduleIndex}-${lessonIndex}`}
                                    checked={lesson.is_free}
                                    onCheckedChange={(checked) => updateLesson(moduleIndex, lessonIndex, 'is_free', checked as boolean)}
                                  />
                                  <Label htmlFor={`lesson-free-${moduleIndex}-${lessonIndex}`} className="text-sm">
                                    Lección gratuita (disponible sin inscripción)
                                  </Label>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          {module.lessons.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No hay lecciones en este módulo. Agrega al menos una lección.
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {modules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay módulos creados. Agrega módulos para organizar el contenido del curso.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/admin/cursos')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Curso"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}