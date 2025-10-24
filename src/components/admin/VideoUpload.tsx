import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoUploadProps {
  lessonId: string;
  currentVideoUrl?: string;
  onUploadComplete: (videoUrl: string) => void;
}

export function VideoUpload({ lessonId, currentVideoUrl, onUploadComplete }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar que sea un video
    if (!selectedFile.type.startsWith('video/')) {
      toast({
        title: 'Archivo inválido',
        description: 'Por favor selecciona un archivo de video (MP4, WebM, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño (máximo 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > maxSize) {
      toast({
        title: 'Archivo muy grande',
        description: 'El video no debe superar los 500MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${lessonId}-${Date.now()}.${fileExt}`;
      const filePath = `lessons/${fileName}`;

      console.log('📤 Uploading video:', { fileName, size: file.size });

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('lesson-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      console.log('✅ Video uploaded successfully:', data);

      // Obtener URL pública del storage
      const { data: { publicUrl } } = supabase.storage
        .from('lesson-videos')
        .getPublicUrl(filePath);

      setProgress(100);
      
      toast({
        title: 'Video subido exitosamente',
        description: 'El video está listo para usar',
      });

      onUploadComplete(publicUrl);
      setFile(null);

    } catch (error: any) {
      console.error('❌ Error uploading video:', error);
      toast({
        title: 'Error al subir video',
        description: error.message || 'Ocurrió un error al subir el video',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setProgress(0);
  };

  const isNativeVideo = currentVideoUrl && currentVideoUrl.includes('supabase.co/storage');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="video-upload">
          Video de la Lección
          <span className="text-xs text-muted-foreground ml-2">
            (Formatos: MP4, WebM, MOV - Máx: 500MB)
          </span>
        </Label>

        {currentVideoUrl && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isNativeVideo ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <div className="text-sm">
                  <p className="font-medium">
                    {isNativeVideo ? 'Video Nativo' : 'Video Externo (YouTube)'}
                  </p>
                  <p className="text-xs text-muted-foreground break-all">
                    {currentVideoUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!file && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
          <Input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="video-upload" className="cursor-pointer">
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Click para seleccionar un video
            </p>
            <p className="text-xs text-muted-foreground">
              O arrastra y suelta aquí
            </p>
          </label>
        </div>
      )}

      {file && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="bg-primary/10 p-2 rounded">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Subiendo video... {progress}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? 'Subiendo...' : 'Subir Video'}
            </Button>
            {!uploading && (
              <Button
                variant="outline"
                onClick={handleRemoveFile}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>💡 Ventaja de Videos Nativos:</strong> El progreso se guarda automáticamente
          y se restaura cuando el usuario vuelve a la lección, incluso si cambia de pestaña.
          Con YouTube esto no es posible.
        </p>
      </div>
    </div>
  );
}
