import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Checkout from '@/components/checkout/Checkout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function CourseCheckout() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!courseId) {
      navigate('/cursos');
      return;
    }

    loadCourseData();
  }, [courseId, user]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      
      const { data: courseData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (error) throw error;
      
      if (courseData) {
        setCourseData(courseData);
      } else {
        setError('Curso no encontrado');
      }
    } catch (error: any) {
      console.error('Error loading course:', error);
      setError('Error al cargar el curso');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/curso/${courseId}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al curso
            </Button>
          </div>
          
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/cursos')}>
              Explorar cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/curso/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al curso
          </Button>
          <h1 className="text-3xl font-bold">Comprar Curso</h1>
          <p className="text-muted-foreground">
            {courseData.title}
          </p>
        </div>
        
        <Checkout 
          mode="single" 
          courseId={courseId}
          courseData={courseData}
        />
      </div>
    </div>
  );
}
