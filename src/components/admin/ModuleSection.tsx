import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ChevronDown, ChevronRight, Upload, Play } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Lesson {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  video_file?: File;
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
}

export interface Module {
  id?: string;
  title: string;
  description: string;
  order_number: number;
  lessons: Lesson[];
}

interface ModuleSectionProps {
  modules: Module[];
  setModules: (modules: Module[]) => void;
}

export function ModuleSection({ modules, setModules }: ModuleSectionProps) {
  const { toast } = useToast();
  const [openModules, setOpenModules] = useState<number[]>([]);
  const [uploadingVideos, setUploadingVideos] = useState<{ [key: string]: boolean }>({});

  const addModule = () => {
    const newModule: Module = {
      title: "",
      description: "",
      order_number: modules.length + 1,
      lessons: []
    };
    setModules([...modules, newModule]);
    setOpenModules([...openModules, modules.length]);
  };

  const updateModule = (index: number, field: keyof Module, value: any) => {
    const updatedModules = [...modules];
    updatedModules[index] = { ...updatedModules[index], [field]: value };
    setModules(updatedModules);
  };

  const removeModule = (index: number) => {
    const updatedModules = modules.filter((_, i) => i !== index);
    // Reorder modules
    updatedModules.forEach((module, i) => {
      module.order_number = i + 1;
    });
    setModules(updatedModules);
    setOpenModules(openModules.filter(i => i !== index));
  };

  const addLesson = (moduleIndex: number) => {
    const newLesson: Lesson = {
      title: "",
      description: "",
      video_url: "",
      duration_minutes: 0,
      order_number: modules[moduleIndex].lessons.length + 1,
      is_free: false
    };
    
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons.push(newLesson);
    setModules(updatedModules);
  };

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: any) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons[lessonIndex] = {
      ...updatedModules[moduleIndex].lessons[lessonIndex],
      [field]: value
    };
    setModules(updatedModules);
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    const updatedModules = [...modules];
    updatedModules[moduleIndex].lessons = updatedModules[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
    // Reorder lessons
    updatedModules[moduleIndex].lessons.forEach((lesson, i) => {
      lesson.order_number = i + 1;
    });
    setModules(updatedModules);
  };

  const handleVideoUpload = async (moduleIndex: number, lessonIndex: number, file: File) => {
    const uploadKey = `${moduleIndex}-${lessonIndex}`;
    setUploadingVideos(prev => ({ ...prev, [uploadKey]: true }));

    try {
      // Generate temporary lesson ID for file path
      const tempId = crypto.randomUUID();
      const filePath = `${tempId}/${file.name}`;

      const { data, error } = await supabase.storage
        .from('lesson-videos')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(filePath);

      updateLesson(moduleIndex, lessonIndex, 'video_url', publicUrl);
      updateLesson(moduleIndex, lessonIndex, 'video_file', file);

      toast({
        title: "Video subido exitosamente",
        description: "El video se ha subido correctamente."
      });
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error al subir video",
        description: error.message || "No se pudo subir el video",
        variant: "destructive"
      });
    } finally {
      setUploadingVideos(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const toggleModule = (index: number) => {
    setOpenModules(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Módulos y Lecciones</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Organiza el contenido del curso en módulos y lecciones
            </p>
          </div>
          <Button type="button" onClick={addModule}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Módulo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.map((module, moduleIndex) => (
          <Collapsible 
            key={moduleIndex} 
            open={openModules.includes(moduleIndex)}
            onOpenChange={() => toggleModule(moduleIndex)}
          >
            <Card className="border-l-4 border-l-primary">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {openModules.includes(moduleIndex) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Badge variant="outline">Módulo {module.order_number}</Badge>
                      <span className="font-medium">
                        {module.title || "Nuevo Módulo"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {module.lessons.length} lección{module.lessons.length !== 1 ? 'es' : ''}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeModule(moduleIndex);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título del Módulo *</Label>
                      <Input
                        value={module.title}
                        onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                        placeholder="Ej: Introducción al Patronaje"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Orden</Label>
                      <Input
                        type="number"
                        value={module.order_number}
                        onChange={(e) => updateModule(moduleIndex, 'order_number', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción del Módulo</Label>
                    <Textarea
                      value={module.description}
                      onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                      placeholder="Describe lo que se aprende en este módulo..."
                      rows={2}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Lecciones</h4>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => addLesson(moduleIndex)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Lección
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <Card key={lessonIndex} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline">
                              Lección {lesson.order_number}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLesson(moduleIndex, lessonIndex)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label>Título de la Lección *</Label>
                              <Input
                                value={lesson.title}
                                onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'title', e.target.value)}
                                placeholder="Ej: Medidas básicas del cuerpo"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Duración (minutos)</Label>
                              <Input
                                type="number"
                                value={lesson.duration_minutes}
                                onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'duration_minutes', parseInt(e.target.value))}
                                min="0"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Descripción de la Lección</Label>
                              <Textarea
                                value={lesson.description}
                                onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'description', e.target.value)}
                                placeholder="Describe el contenido de esta lección..."
                                rows={2}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Video de la Lección</Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="file"
                                  accept="video/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleVideoUpload(moduleIndex, lessonIndex, file);
                                    }
                                  }}
                                  disabled={uploadingVideos[`${moduleIndex}-${lessonIndex}`]}
                                />
                                {uploadingVideos[`${moduleIndex}-${lessonIndex}`] && (
                                  <Badge variant="secondary">Subiendo...</Badge>
                                )}
                                {lesson.video_url && (
                                  <Badge variant="default" className="flex items-center">
                                    <Play className="h-3 w-3 mr-1" />
                                    Video cargado
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`free-${moduleIndex}-${lessonIndex}`}
                                checked={lesson.is_free}
                                onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'is_free', e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor={`free-${moduleIndex}-${lessonIndex}`}>
                                Lección gratuita (visible sin inscripción)
                              </Label>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

        {modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay módulos creados aún.</p>
            <p className="text-sm">Haz clic en "Agregar Módulo" para comenzar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}