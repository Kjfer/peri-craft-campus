import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  video_url?: string; // Opcional - solo se incluye si el usuario tiene acceso
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
  course_id: string;
  module_id?: string;
}

export function useLessons(courseId: string) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);

      // Primero verificar si el usuario tiene acceso al curso
      let hasAccess = false;
      
      if (user) {
        // Verificar si es admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile?.role === 'admin') {
          hasAccess = true;
        } else {
          // Verificar enrollment
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .maybeSingle();

          hasAccess = !!enrollment;
        }
      }

      // Obtener todas las lecciones (siempre incluir video_url)
      const { data, error: fetchError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          description,
          content,
          video_url,
          duration_minutes,
          order_number,
          is_free,
          course_id,
          module_id
        `)
        .eq('course_id', courseId)
        .order('order_number');

      if (fetchError) {
        throw fetchError;
      }

      // Para lecciones gratuitas, incluir video_url incluso si no tienen acceso general
      const processedLessons = data?.map(lesson => ({
        ...lesson,
        video_url: (hasAccess || lesson.is_free) ? lesson.video_url : undefined
      })) || [];

      setLessons(processedLessons);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError('Error cargando lecciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchLessons();
    }
  }, [courseId, user]);

  return {
    lessons,
    loading,
    error,
    refetch: fetchLessons
  };
}