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
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { courseAPI, adminAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id?: number;
  title: string;
  description: string;
  content: string;
  video_url: string;
  duration_minutes: number;
  is_free: boolean;
}

interface Module {
  id?: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface CourseFormData {
  title: string;
  description: string;
  price: number;
  discounted_price?: number;
  thumbnail_url?: string;
  featured: boolean;
  status: string;
  modules: Module[];
}

function EditCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<{ [key: number]: boolean }>({});
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    price: 0,
    discounted_price: undefined,
    thumbnail_url: "",
    featured: false,
    status: "active",
    modules: []
  });

  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      const data = await courseAPI.getById(id!);
      
      if (data.success && data.course) {
        const course = data.course;
        setFormData({
          title: course.title || "",
          description: course.description || "",
          price: course.price || 0,
          discounted_price: course.discounted_price || undefined,
          thumbnail_url: course.thumbnail_url || "",
          featured: course.featured || false,
          status: course.status || "active",
          modules: course.modules || []
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
      
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.price,
        discounted_price: formData.discounted_price || null,
        thumbnail_url: formData.thumbnail_url?.trim() || null,
        featured: formData.featured,
        status: formData.status,
        modules: formData.modules
      };

      const data = await adminAPI.updateCourse(id!, updateData);
      
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Curso actualizado correctamente"
        });
        navigate("/admin/cursos");
      }
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

  const toggleModuleExpansion = (index: number) => {
    setExpandedModules(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
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
                <Label htmlFor="thumbnail_url">URL de Imagen</Label>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
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
                Organiza el contenido del curso en módulos y lecciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.modules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay módulos creados. Agrega el primer módulo.
                </p>
              ) : (
                formData.modules.map((module, moduleIndex) => (
                  <Card key={moduleIndex} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => toggleModuleExpansion(moduleIndex)}
                          >
                            {expandedModules[moduleIndex] ? (
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
                    
                    {expandedModules[moduleIndex] && (
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
                            <div className="space-y-3">
                              {module.lessons.map((lesson, lessonIndex) => (
                                <Card key={lessonIndex} className="bg-muted/50">
                                  <CardContent className="p-4">
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
                                      <div className="space-y-2">
                                        <Label>URL del Video</Label>
                                        <Input
                                          value={lesson.video_url}
                                          onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'video_url', e.target.value)}
                                          placeholder="https://youtube.com/watch?v=..."
                                        />
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
                                    <div className="mt-4">
                                      <Label>Contenido de la Lección</Label>
                                      <Textarea
                                        value={lesson.content}
                                        onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'content', e.target.value)}
                                        placeholder="Contenido detallado de la lección..."
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
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
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
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
