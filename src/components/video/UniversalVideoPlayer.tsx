import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';

interface UniversalVideoPlayerProps {
  videoUrl: string;
  title?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  className?: string;
}

// Función para determinar el tipo de video
const getVideoType = (url: string): 'youtube' | 'supabase' | 'direct' | 'unknown' => {
  if (!url) return 'unknown';
  
  // YouTube URLs
  const youtubeRegex = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  if (youtubeRegex.test(url)) return 'youtube';
  
  // Supabase Storage URLs (tanto público como privado)
  if (url.includes('supabase.co') && url.includes('storage/v1/object/')) return 'supabase';
  
  // URLs directas de video (mp4, webm, etc.)
  const directVideoRegex = /\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i;
  if (directVideoRegex.test(url)) return 'direct';
  
  return 'unknown';
};

// Función para extraer ID de YouTube
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
};

// Componente para video de YouTube
const YouTubePlayer: React.FC<{ videoUrl: string; title?: string }> = ({ videoUrl, title }) => {
  const videoId = getYouTubeVideoId(videoUrl);
  
  if (!videoId) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
        <div className="text-center text-white">
          <p className="text-lg mb-2">❌ URL de YouTube inválida</p>
          <p className="text-sm opacity-70">URL: {videoUrl}</p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&modestbranding=1&rel=0`;
  
  return (
    <div className="aspect-video">
      <iframe
        src={embedUrl}
        title={title || "Video lesson"}
        className="w-full h-full rounded-lg"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

// Componente para video HTML5 nativo
const NativeVideoPlayer: React.FC<{
  videoUrl: string;
  title?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}> = ({ videoUrl, title, onTimeUpdate, onDurationChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleDurationChange = () => {
      const dur = video.duration;
      setDuration(dur);
      onDurationChange?.(dur);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        setBuffered((bufferedEnd / duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('loadedmetadata', handleDurationChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [onTimeUpdate, onDurationChange]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const newTime = (value[0] / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0] / 100;
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      video.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = 0;
    setCurrentTime(0);
  };

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        onClick={togglePlay}
        onError={(e) => console.error('Error loading video:', e)}
      />
      
      {/* Loading spinner */}
      {buffered < 100 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[duration ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={restartVideo}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente para video de Supabase con autenticación
const SupabaseVideoPlayer: React.FC<{
  videoUrl: string;
  title?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}> = ({ videoUrl, title, onTimeUpdate, onDurationChange }) => {
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Si ya es una URL pública, usarla directamente
        if (videoUrl.includes('/storage/v1/object/public/')) {
          console.log('📺 Using public Supabase URL directly:', videoUrl);
          setFinalUrl(videoUrl);
          return;
        }

        // Si es una URL privada, intentar obtener signed URL
        if (videoUrl.includes('/storage/v1/object/')) {
          console.log('🔒 Processing private Supabase URL:', videoUrl);
          
          // Extraer el path del archivo desde la URL
          const urlParts = videoUrl.split('/object/');
          if (urlParts.length !== 2) {
            throw new Error('Formato de URL de Supabase inválido');
          }
          
          const pathPart = urlParts[1];
          const bucketAndPath = pathPart.split('/');
          const bucket = bucketAndPath[0];
          const filePath = bucketAndPath.slice(1).join('/');

          console.log('🗂️ Extracting signed URL for:', { bucket, filePath });

          // Obtener URL firmada para acceso privado
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(filePath, 60 * 60 * 24); // 24 horas

          if (error) throw error;

          setFinalUrl(data.signedUrl);
          return;
        }

        // Si no es reconocida como URL de Supabase, usar directamente
        setFinalUrl(videoUrl);

      } catch (err: any) {
        console.error('❌ Error processing Supabase URL:', err);
        setError(err.message || 'Error cargando video');
      } finally {
        setLoading(false);
      }
    };

    processUrl();
  }, [videoUrl]);

  if (loading) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando video...</p>
        </div>
      </div>
    );
  }

  if (error || !finalUrl) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
        <div className="text-center text-white">
          <p className="text-lg mb-2">❌ Error cargando video</p>
          <p className="text-sm opacity-70">{error}</p>
          <p className="text-xs opacity-50 mt-2">URL: {videoUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <NativeVideoPlayer
      videoUrl={finalUrl}
      title={title}
      onTimeUpdate={onTimeUpdate}
      onDurationChange={onDurationChange}
    />
  );
};

// Componente principal
const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  videoUrl,
  title,
  onTimeUpdate,
  onDurationChange,
  className = ""
}) => {
  const videoType = getVideoType(videoUrl);

  console.log('🎬 UniversalVideoPlayer:', { videoUrl, videoType });

  switch (videoType) {
    case 'youtube':
      return (
        <div className={className}>
          <YouTubePlayer videoUrl={videoUrl} title={title} />
        </div>
      );
    
    case 'supabase':
      return (
        <div className={className}>
          <SupabaseVideoPlayer 
            videoUrl={videoUrl} 
            title={title}
            onTimeUpdate={onTimeUpdate}
            onDurationChange={onDurationChange}
          />
        </div>
      );
    
    case 'direct':
      return (
        <div className={className}>
          <NativeVideoPlayer 
            videoUrl={videoUrl} 
            title={title}
            onTimeUpdate={onTimeUpdate}
            onDurationChange={onDurationChange}
          />
        </div>
      );
    
    default:
      return (
        <div className={`aspect-video bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
          <div className="text-center text-white">
            <p className="text-lg mb-2">❌ Formato de video no soportado</p>
            <p className="text-sm opacity-70">URL: {videoUrl}</p>
            <p className="text-xs opacity-50 mt-2">
              Formatos soportados: YouTube, Supabase Storage, MP4/WebM directo
            </p>
          </div>
        </div>
      );
  }
};

export default UniversalVideoPlayer;